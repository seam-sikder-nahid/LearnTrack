"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  journalEntries,
  githubRepositories,
  githubSyncs,
  goals,
  tasks,
  milestones,
  dailyProgress,
} from "@/lib/db/schema";
import { auth } from "@/lib/auth/config";
import { getGithubAccessToken } from "@/lib/github/token";
import {
  pushLearningActivity,
  SyncError,
  SYNC_ERROR_MESSAGES,
} from "@/lib/github/sync-engine";
import { generateProgressJson, generateReadme } from "@/lib/github/progress-file";
import { formatCommitMessage } from "@/lib/github/commit-message";
import { dailySyncKey } from "@/lib/journal/idempotency";
import { removeFromQueue, bumpRetry } from "./sync-queue";
import { calculateStreak } from "@/lib/streak/calculate";
import { dateKeyRange, todayKey, toDateKey } from "@/lib/dates";

export type SyncNowResult =
  | { ok: true; commitSha: string; filesChanged: string[] }
  | { ok: false; code: string; message: string };

/**
 * Performs one GitHub sync for `date` (default: today). This is the only
 * function in the app that actually calls the GitHub API to write data —
 * everything else just enqueues work for this function to pick up.
 *
 * On failure (§32): the learning data already exists in the DB regardless
 * of what happens here, the sync stays in the Pending Sync Queue with a
 * backoff, and we return a typed, user-safe error message — never a raw
 * exception to the UI.
 */
export async function syncNow(dateOverride?: string): Promise<SyncNowResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, code: "unauthenticated", message: "Not signed in." };
  const userId = session.user.id;
  const date = dateOverride ?? todayKey();

  const [journal] = await db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.userId, userId), eq(journalEntries.date, date)))
    .limit(1);

  if (!journal) {
    return { ok: false, code: "no_activity", message: "No learning activity recorded for this date yet." };
  }

  const [repo] = await db
    .select()
    .from(githubRepositories)
    .where(and(eq(githubRepositories.userId, userId), eq(githubRepositories.isActive, true)))
    .limit(1);

  if (!repo) {
    return { ok: false, code: "no_repo", message: "Connect a GitHub repository in Settings first." };
  }

  const idempotencyKey = dailySyncKey({ userId, date });

  const [existingSync] = await db
    .select()
    .from(githubSyncs)
    .where(eq(githubSyncs.idempotencyKey, idempotencyKey))
    .limit(1);

  if (existingSync?.status === "success") {
    // Already synced for this exact day — regenerating the same content is
    // still safe (idempotent PUT), but we short-circuit to avoid a wasted
    // API call and an unnecessary empty commit.
    return {
      ok: true,
      commitSha: existingSync.commitSha ?? "",
      filesChanged: existingSync.filesChanged ? JSON.parse(existingSync.filesChanged) : [],
    };
  }

  await db
    .insert(githubSyncs)
    .values({ userId, repositoryId: repo.id, date, idempotencyKey, status: "syncing" })
    .onConflictDoUpdate({
      target: githubSyncs.idempotencyKey,
      set: { status: "syncing" },
    });

  try {
    const accessToken = await getGithubAccessToken(userId);

    const goal = journal.goalId
      ? (await db.select().from(goals).where(eq(goals.id, journal.goalId)).limit(1))[0]
      : undefined;

    const settingsFiles = await buildProgressFiles(userId, journal.goalId ?? undefined, date);

    const commitMessage = formatCommitMessage({
      format: "Learning: {goal} — {date}",
      goalTitle: goal?.title ?? "LearnTrack",
      date,
    });

    const result = await pushLearningActivity({
      accessToken,
      owner: repo.owner,
      repo: repo.name,
      branch: repo.defaultBranch,
      commitMessage,
      files: [
        { path: `daily/${date}.md`, content: journal.markdown },
        ...settingsFiles,
      ],
    });

    await db
      .update(githubSyncs)
      .set({
        status: "success",
        commitMessage,
        commitSha: result.commitSha,
        filesChanged: JSON.stringify(result.filesChanged),
        completedAt: new Date(),
        attempts: (existingSync?.attempts ?? 0) + 1,
      })
      .where(eq(githubSyncs.idempotencyKey, idempotencyKey));

    await removeFromQueue(userId, date);

    return { ok: true, commitSha: result.commitSha, filesChanged: result.filesChanged };
  } catch (err) {
    const syncErr =
      err instanceof SyncError
        ? err
        : new SyncError("unknown", undefined, err instanceof Error ? err.message : "Unknown error");

    await db
      .update(githubSyncs)
      .set({
        status: "failed",
        errorCode: syncErr.code,
        errorMessage: SYNC_ERROR_MESSAGES[syncErr.code],
        attempts: (existingSync?.attempts ?? 0) + 1,
      })
      .where(eq(githubSyncs.idempotencyKey, idempotencyKey));

    await bumpRetry(userId, date);

    // Server-side log only — never includes the access token (§30).
    console.error(`[github-sync] failed for user=${userId} date=${date} code=${syncErr.code}`);

    return { ok: false, code: syncErr.code, message: SYNC_ERROR_MESSAGES[syncErr.code] };
  }
}

async function buildProgressFiles(userId: string, goalId: string | undefined, date: string) {
  if (!goalId) return [];
  const [goal] = await db.select().from(goals).where(eq(goals.id, goalId)).limit(1);
  if (!goal) return [];

  const goalMilestones = await db
    .select()
    .from(milestones)
    .where(eq(milestones.goalId, goalId));

  const goalTasks = await db.select().from(tasks).where(eq(tasks.goalId, goalId));
  const completedCount = goalTasks.filter((t) => t.status === "completed").length;
  const overallProgressPercent =
    goalTasks.length > 0 ? Math.round((completedCount / goalTasks.length) * 100) : 0;

  const startKey = toDateKey(goal.startDate);
  const rangeEnd = date < startKey ? startKey : date;
  const progressRows = await db
    .select()
    .from(dailyProgress)
    .where(eq(dailyProgress.userId, userId));
  const byDate = new Map(progressRows.map((r) => [r.date, r]));
  const days = dateKeyRange(startKey, rangeEnd).map((d) => ({
    date: d,
    countsForStreak: byDate.get(d)?.countsForStreak ?? false,
  }));
  const streak = calculateStreak(days);

  const shared = {
    goalTitle: goal.title,
    startDate: startKey,
    targetDate: toDateKey(goal.targetDate),
    overallProgressPercent,
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    totalLearningDays: streak.totalLearningDays,
    totalTasksCompleted: completedCount,
    milestones: goalMilestones.map((m) => ({ title: m.title, status: m.status })),
    updatedAt: new Date().toISOString(),
  };

  return [
    { path: "progress.json", content: generateProgressJson(shared) },
    { path: "README.md", content: generateReadme(shared) },
  ];
}
