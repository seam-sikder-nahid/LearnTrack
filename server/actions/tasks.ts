"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { tasks, goals } from "@/lib/db/schema";
import { auth } from "@/lib/auth/config";
import { toDateKey, todayKey } from "@/lib/dates";

const CreateTaskInput = z.object({
  goalId: z.string(),
  milestoneId: z.string().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  estimatedMinutes: z.number().int().positive().max(600).default(30),
  scheduledDate: z.string().datetime(),
});

export async function createTask(input: z.infer<typeof CreateTaskInput>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");
  const userId = session.user.id;
  const parsed = CreateTaskInput.parse(input);

  const [goal] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, parsed.goalId), eq(goals.userId, userId)))
    .limit(1);
  if (!goal) throw new Error("GOAL_NOT_FOUND_OR_FORBIDDEN");

  const [task] = await db
    .insert(tasks)
    .values({
      userId,
      goalId: parsed.goalId,
      milestoneId: parsed.milestoneId ?? null,
      title: parsed.title,
      description: parsed.description ?? null,
      category: parsed.category ?? null,
      difficulty: parsed.difficulty,
      estimatedMinutes: parsed.estimatedMinutes,
      scheduledDate: new Date(parsed.scheduledDate),
    })
    .returning();
  return task;
}

export async function skipTask(taskId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");
  await db
    .update(tasks)
    .set({ status: "skipped", updatedAt: new Date() })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, session.user.id)));
}

export async function reopenTask(taskId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");
  await db
    .update(tasks)
    .set({ status: "pending", updatedAt: new Date() })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, session.user.id)));
}

export async function getTasksForDate(userId: string, dateKey: string) {
  const all = await db.select().from(tasks).where(eq(tasks.userId, userId));
  return all
    .filter((t) => toDateKey(t.scheduledDate) === dateKey)
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

export async function getTodaysTasks(userId: string) {
  return getTasksForDate(userId, todayKey());
}
