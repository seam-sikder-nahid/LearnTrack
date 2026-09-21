import { describe, it, expect } from "vitest";
import { toSyncError, SYNC_ERROR_MESSAGES } from "@/lib/github/sync-engine";

function octokitError(status: number, headers: Record<string, string> = {}) {
  return { status, response: { headers } };
}

describe("toSyncError", () => {
  it("maps 401 to unauthorized", () => {
    expect(toSyncError(octokitError(401)).code).toBe("unauthorized");
  });

  it("maps 403 with zero rate-limit-remaining to rate_limited", () => {
    const err = octokitError(403, { "x-ratelimit-remaining": "0" });
    expect(toSyncError(err).code).toBe("rate_limited");
  });

  it("maps a plain 403 (not rate limit) to forbidden", () => {
    expect(toSyncError(octokitError(403)).code).toBe("forbidden");
  });

  it("maps 404 to not_found", () => {
    expect(toSyncError(octokitError(404)).code).toBe("not_found");
  });

  it("maps 409 to conflict", () => {
    expect(toSyncError(octokitError(409)).code).toBe("conflict");
  });

  it("maps 422 to unprocessable", () => {
    expect(toSyncError(octokitError(422)).code).toBe("unprocessable");
  });

  it("maps 429 to rate_limited", () => {
    expect(toSyncError(octokitError(429)).code).toBe("rate_limited");
  });

  it("maps 5xx to server_error", () => {
    expect(toSyncError(octokitError(503)).code).toBe("server_error");
  });

  it("maps unrecognized errors to unknown, never throwing on malformed input", () => {
    expect(toSyncError(new Error("boom")).code).toBe("unknown");
    expect(toSyncError("a plain string").code).toBe("unknown");
  });

  it("every error code has a user-safe message with no raw stack trace", () => {
    for (const message of Object.values(SYNC_ERROR_MESSAGES)) {
      expect(message).not.toMatch(/at .*:\d+:\d+/); // no stack-trace-looking text
      expect(message.length).toBeGreaterThan(10);
    }
  });
});
