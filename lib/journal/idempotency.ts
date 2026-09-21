import { createHash } from "node:crypto";

/**
 * Deterministic idempotency keys (§38 GitHub Sync Idempotency).
 *
 * The same (userId, taskId, date) always hashes to the same key, so:
 *  - double-clicking "Complete Task" twice in a row
 *  - a browser refresh mid-request
 *  - a network timeout + client retry
 * ...can never create two TaskCompletion rows or two GitHub commits for the
 * same piece of learning activity. Callers must catch the unique-constraint
 * violation on `taskCompletions.idempotencyKey` / `githubSyncs.idempotencyKey`
 * and treat it as "already done" rather than an error.
 */

export function taskCompletionKey(params: {
  userId: string;
  taskId: string;
  /** Calendar date the completion is recorded against, "YYYY-MM-DD". */
  date: string;
}): string {
  return hash(`completion:${params.userId}:${params.taskId}:${params.date}`);
}

/**
 * One sync idempotency key per (user, date). This is what makes §12's rule
 * real: "if the user completes 4 tasks in one session, prefer ONE commit."
 * Every completion that lands on the same day resolves to the same sync key,
 * so the sync engine naturally coalesces them into a single pending sync
 * that gets amended/regenerated until it's actually pushed.
 */
export function dailySyncKey(params: { userId: string; date: string }): string {
  return hash(`sync:${params.userId}:${params.date}`);
}

function hash(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}
