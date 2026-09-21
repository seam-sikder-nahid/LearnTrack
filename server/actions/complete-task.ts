"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  tasks,
  taskCompletions,
  journalEntries,
  dailyProgress,
  goals,
  userSettings,
} from "@/lib/db/schema";
import { auth } from "@/lib/auth/config";
import { taskCompletionKey } from "@/lib/journal/idempotency";
import { generateJournalMarkdown, deriveTopics } from "@/lib/journal/generate";
import { queueDailySync } from "./sync-queue";
import { toDateKey } from "@/lib/dates";

/**
 * §8/§9/§38: the single entry point for "the user clicked Complete Task".
 *
 * Steps, in order, and each one is idempotent on its own:
 *  1. Validate input.
 *  2. Insert the TaskCompletion row, guarded by a deterministic idempotency
 *     key — a duplicate call (double click, retry, refresh) is detected via
 *     the unique constraint and treated as a no-op success, not an error.
 *  3. Mark the Task as completed.
 *  4. Recompute DailyProgress for that date (this is what streak reads).
 *  5. Regenerate that day's JournalEntry from ALL of that day's completions
 *     (not just this one) — so completing 4 tasks in a session produces one
 *     coherent journal entry, matching §12's "one commit, not four".
 *  6. Enqueue (or refresh) that day's sync — actual GitHub push happens in
 *     the sync worker (server/actions/sync-now.ts), respecting the user's
 *     sync mode (§24: automatic / manual / queue until confirmed).
 *
 * This function never talks to the GitHub API directly — see §2: GitHub
 * sync is a side effect, and keeping it out of this function means a
 * GitHub outage can never block or corrupt the user's actual learning
 * record.
 */

const CompleteTaskInput = z.object({
  taskId: z.string().min(1),
  whatLearned: z.string().min(1, "Tell me what you learned.").max(4000),
  notes: z.string().max(4000).optional(),
  resources: z.array(z.string().url()).max(20).optional(),
});

export type CompleteTaskResult =
  | { ok: true; alreadyCompleted: boolean; journalUpdated: boolean; syncQueued: boolean }
  | { ok: false; error: string };

export async function completeTask(
  input: z.infer<typeof CompleteTaskInput>,
): Promise<CompleteTaskResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "UNAUTHENTICATED" };
  }
  const userId = session.user.id;

  const parsed = CompleteTaskInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "INVALID_INPUT" };
  }
  const { taskId, whatLearned, notes, resources } = parsed.data;

  // Authorization: the task must belong to this user (protection against
  // IDOR — §30). We look it up rather than trusting a client-supplied
  // userId anywhere.
  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .limit(1);

  if (!task) {
    return { ok: false, error: "TASK_NOT_FOUND" };
  }

  const dateKey = toDateKey(task.scheduledDate);
  const idempotencyKey = taskCompletionKey({ userId, taskId, date: dateKey });

  let alreadyCompleted = false;
  try {
    await db.insert(taskCompletions).values({
      taskId,
      userId,
      idempotencyKey,
      whatLearned,
      notes: notes ?? null,
      resources: resources ? JSON.stringify(resources) : null,
    });
  } catch (err) {
    // Unique constraint on idempotencyKey -> this exact completion already
    // exists. Treat as success, not an error (§38).
    if (isUniqueConstraintError(err)) {
      alreadyCompleted = true;
    } else {
      throw err;
    }
  }

  if (!alreadyCompleted) {
    await db
      .update(tasks)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(tasks.id, taskId));
  }

  await recomputeDailyProgress(userId, dateKey);
  await regenerateJournalEntry(userId, task.goalId, dateKey);

  const settings = await getOrCreateSettings(userId);
  let syncQueued = false;
  if (settings.syncMode !== "manual") {
    await queueDailySync({ userId, date: dateKey, reason: "task_completed" });
    syncQueued = true;
  }

  return { ok: true, alreadyCompleted, journalUpdated: true, syncQueued };
}

async function recomputeDailyProgress(userId: string, dateKey: string) {
  const dayTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, userId));

  const scheduledForDay = dayTasks.filter(
    (t) => toDateKey(t.scheduledDate) === dateKey,
  );
  const completed = scheduledForDay.filter((t) => t.status === "completed");
  const minutes = completed.reduce((sum, t) => sum + t.estimatedMinutes, 0);

  await db
    .insert(dailyProgress)
    .values({
      userId,
      date: dateKey,
      tasksPlanned: scheduledForDay.length,
      tasksCompleted: completed.length,
      minutesLearned: minutes,
      countsForStreak: completed.length > 0,
    })
    .onConflictDoUpdate({
      target: [dailyProgress.userId, dailyProgress.date],
      set: {
        tasksPlanned: scheduledForDay.length,
        tasksCompleted: completed.length,
        minutesLearned: minutes,
        countsForStreak: completed.length > 0,
      },
    });
}

async function regenerateJournalEntry(
  userId: string,
  goalId: string,
  dateKey: string,
) {
  const [goal] = await db.select().from(goals).where(eq(goals.id, goalId)).limit(1);
  if (!goal) return;

  const dayTasks = await db.select().from(tasks).where(eq(tasks.userId, userId));
  const scheduledForDay = dayTasks.filter(
    (t) => toDateKey(t.scheduledDate) === dateKey,
  );
  const completedForDay = scheduledForDay.filter((t) => t.status === "completed");

  const completions = await db
    .select()
    .from(taskCompletions)
    .where(eq(taskCompletions.userId, userId));

  const completedTaskIds = new Set(completedForDay.map((t) => t.id));
  const relevantCompletions = completions.filter((c) => completedTaskIds.has(c.taskId));

  const forJournal = completedForDay.map((t) => {
    const completion = relevantCompletions.find((c) => c.taskId === t.id);
    return {
      title: t.title,
      category: t.category,
      whatLearned: completion?.whatLearned ?? "",
      notes: completion?.notes ?? null,
      resources: completion?.resources ? (JSON.parse(completion.resources) as string[]) : [],
    };
  });

  const markdown = generateJournalMarkdown({
    date: dateKey,
    goalTitle: goal.title,
    tasksPlannedCount: scheduledForDay.length,
    completedTasks: forJournal,
  });

  const topics = deriveTopics(forJournal);

  await db
    .insert(journalEntries)
    .values({
      userId,
      goalId,
      date: dateKey,
      markdown,
      tasksCompletedCount: completedForDay.length,
      tasksPlannedCount: scheduledForDay.length,
      topics: JSON.stringify(topics),
    })
    .onConflictDoUpdate({
      target: [journalEntries.userId, journalEntries.date],
      set: {
        markdown,
        tasksCompletedCount: completedForDay.length,
        tasksPlannedCount: scheduledForDay.length,
        topics: JSON.stringify(topics),
        updatedAt: new Date(),
      },
    });
}

async function getOrCreateSettings(userId: string) {
  const [existing] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(userSettings)
    .values({ userId })
    .returning();
  return created;
}

function isUniqueConstraintError(err: unknown): boolean {
  return (
    err instanceof Error &&
    /UNIQUE constraint failed|duplicate key value/i.test(err.message)
  );
}
