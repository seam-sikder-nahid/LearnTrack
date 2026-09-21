"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { syncQueue } from "@/lib/db/schema";
import { dailySyncKey } from "@/lib/journal/idempotency";

/**
 * §13/§14: Pending Sync Queue.
 *
 * `queueDailySync` is called every time a task is completed. Because the
 * idempotency key is derived from (userId, date) only, calling this five
 * times in one day for five different task completions just re-touches the
 * SAME queue row (upsert), rather than creating five queue entries — this
 * is what makes §12's "one commit per day" hold even under the queue.
 */
export async function queueDailySync(params: {
  userId: string;
  date: string;
  reason: "task_completed" | "retry" | "offline";
}) {
  const idempotencyKey = dailySyncKey({ userId: params.userId, date: params.date });

  const [existing] = await db
    .select()
    .from(syncQueue)
    .where(eq(syncQueue.idempotencyKey, idempotencyKey))
    .limit(1);

  if (existing) {
    // Already queued for today — nothing to do, the next sync run will
    // pick up the latest journal content regardless.
    return existing;
  }

  const [created] = await db
    .insert(syncQueue)
    .values({
      userId: params.userId,
      date: params.date,
      idempotencyKey,
      reason: params.reason,
    })
    .returning();
  return created;
}

export async function removeFromQueue(userId: string, date: string) {
  const idempotencyKey = dailySyncKey({ userId, date });
  await db
    .delete(syncQueue)
    .where(
      and(eq(syncQueue.userId, userId), eq(syncQueue.idempotencyKey, idempotencyKey)),
    );
}

export async function bumpRetry(userId: string, date: string) {
  const idempotencyKey = dailySyncKey({ userId, date });
  const [row] = await db
    .select()
    .from(syncQueue)
    .where(eq(syncQueue.idempotencyKey, idempotencyKey))
    .limit(1);
  if (!row) return;

  // Exponential-ish backoff, capped at 1 hour, so a rate limit or outage
  // doesn't hammer the GitHub API (§32).
  const backoffMinutes = Math.min(60, 2 ** (row.retryCount + 1));
  await db
    .update(syncQueue)
    .set({
      retryCount: row.retryCount + 1,
      nextRetryAt: new Date(Date.now() + backoffMinutes * 60_000),
    })
    .where(eq(syncQueue.id, row.id));
}

export async function listPendingSyncs(userId: string) {
  return db.select().from(syncQueue).where(eq(syncQueue.userId, userId));
}
