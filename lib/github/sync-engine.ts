import { Octokit } from "octokit";

/**
 * GitHub Sync Engine (§12, §13, §32).
 *
 * Responsibilities:
 *  - Write/update `daily/<date>.md` and `progress.json` in the user's
 *    connected repository using the Contents API (get-sha-then-put, so
 *    updates are proper commits, not overwrites of history).
 *  - Coalesce same-day activity into ONE commit (the caller passes the full
 *    day's journal markdown each time; we just update the same file/commit
 *    lineage rather than appending).
 *  - Translate GitHub API failures into the typed `SyncError` the rest of
 *    the app (Pending Sync Queue, UI banners) can react to instead of a raw
 *    HTTP error.
 *
 * This module never receives a raw OAuth token from a client request body —
 * it only accepts one from server-side session/account lookup. See
 * lib/github/token.ts.
 */

export type SyncErrorCode =
  | "unauthorized" // 401
  | "forbidden" // 403 (also used for rate limit — GitHub returns 403 for some limits)
  | "not_found" // 404
  | "conflict" // 409 (sha mismatch — someone else edited the file)
  | "unprocessable" // 422
  | "rate_limited" // 429, or 403 with rate-limit headers
  | "server_error" // 5xx
  | "unknown";

export class SyncError extends Error {
  constructor(
    public code: SyncErrorCode,
    public status: number | undefined,
    message: string,
  ) {
    super(message);
    this.name = "SyncError";
  }
}

export interface SyncFileWrite {
  /** Path within the repo, e.g. "daily/2026-09-18.md" */
  path: string;
  content: string;
}

export interface SyncCommitParams {
  accessToken: string;
  owner: string;
  repo: string;
  branch: string;
  commitMessage: string;
  files: SyncFileWrite[];
}

export interface SyncCommitResult {
  commitSha: string;
  filesChanged: string[];
}

export async function pushLearningActivity(
  params: SyncCommitParams,
): Promise<SyncCommitResult> {
  const octokit = new Octokit({ auth: params.accessToken });
  const filesChanged: string[] = [];
  let lastSha = "";

  for (const file of params.files) {
    try {
      const existingSha = await getExistingFileSha(
        octokit,
        params.owner,
        params.repo,
        file.path,
        params.branch,
      );

      const res = await octokit.rest.repos.createOrUpdateFileContents({
        owner: params.owner,
        repo: params.repo,
        path: file.path,
        message: params.commitMessage,
        content: Buffer.from(file.content, "utf-8").toString("base64"),
        branch: params.branch,
        sha: existingSha,
      });

      filesChanged.push(file.path);
      lastSha = res.data.commit.sha ?? lastSha;
    } catch (err) {
      throw toSyncError(err);
    }
  }

  return { commitSha: lastSha, filesChanged };
}

async function getExistingFileSha(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  branch: string,
): Promise<string | undefined> {
  try {
    const res = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });
    if (!Array.isArray(res.data) && res.data.type === "file") {
      return res.data.sha;
    }
    return undefined;
  } catch (err) {
    if (isOctokitStatus(err, 404)) return undefined; // file doesn't exist yet — fine
    throw err;
  }
}

export async function createRepository(params: {
  accessToken: string;
  name: string;
  isPrivate: boolean;
}): Promise<{ owner: string; repo: string; defaultBranch: string }> {
  const octokit = new Octokit({ auth: params.accessToken });
  try {
    const res = await octokit.rest.repos.createForAuthenticatedUser({
      name: params.name,
      private: params.isPrivate,
      description:
        "Learning journal automatically maintained by LearnTrack.",
      auto_init: true,
    });
    return {
      owner: res.data.owner.login,
      repo: res.data.name,
      defaultBranch: res.data.default_branch ?? "main",
    };
  } catch (err) {
    throw toSyncError(err);
  }
}

export async function listUserRepositories(accessToken: string) {
  const octokit = new Octokit({ auth: accessToken });
  try {
    const res = await octokit.rest.repos.listForAuthenticatedUser({
      per_page: 50,
      sort: "updated",
    });
    return res.data.map((r) => ({
      owner: r.owner.login,
      name: r.name,
      fullName: r.full_name,
      private: r.private,
      defaultBranch: r.default_branch ?? "main",
    }));
  } catch (err) {
    throw toSyncError(err);
  }
}

function isOctokitStatus(err: unknown, status: number): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    (err as { status?: number }).status === status
  );
}

export function toSyncError(err: unknown): SyncError {
  const status =
    typeof err === "object" && err !== null && "status" in err
      ? (err as { status?: number }).status
      : undefined;

  const remaining =
    typeof err === "object" &&
    err !== null &&
    "response" in err &&
    (err as { response?: { headers?: Record<string, string> } }).response
      ?.headers?.["x-ratelimit-remaining"];

  if (status === 401) return new SyncError("unauthorized", status, "GitHub authorization expired or invalid.");
  if (status === 403 && remaining === "0") {
    return new SyncError("rate_limited", status, "GitHub rate limit reached.");
  }
  if (status === 403) return new SyncError("forbidden", status, "GitHub denied this operation.");
  if (status === 404) return new SyncError("not_found", status, "Repository or file not found.");
  if (status === 409) return new SyncError("conflict", status, "The file changed since it was last read.");
  if (status === 422) return new SyncError("unprocessable", status, "GitHub rejected the request.");
  if (status === 429) return new SyncError("rate_limited", status, "GitHub rate limit reached.");
  if (status && status >= 500) return new SyncError("server_error", status, "GitHub is currently unavailable.");

  return new SyncError(
    "unknown",
    status,
    err instanceof Error ? err.message : "Unknown GitHub sync error.",
  );
}

/** User-facing copy for each error code (§32 — never show raw stack traces). */
export const SYNC_ERROR_MESSAGES: Record<SyncErrorCode, string> = {
  unauthorized:
    "Your GitHub connection expired. Reconnect GitHub in Settings to resume syncing.",
  forbidden: "GitHub denied this action. Check the app's repository permissions.",
  not_found: "The connected repository could not be found. It may have been deleted or renamed.",
  conflict: "The journal file changed on GitHub since the last sync. Retrying will resolve this automatically.",
  unprocessable: "GitHub rejected the sync request. Your learning data is safe and saved locally.",
  rate_limited: "GitHub rate limit reached. Your learning data is safe and will sync later.",
  server_error: "GitHub is temporarily unavailable. Your learning data is safe and will retry automatically.",
  unknown: "Something went wrong while syncing to GitHub. Your learning data is safe.",
};
