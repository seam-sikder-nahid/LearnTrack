import { describe, it, expect } from "vitest";
import { taskCompletionKey, dailySyncKey } from "@/lib/journal/idempotency";

describe("taskCompletionKey", () => {
  it("is deterministic for identical inputs (double-click / retry safety)", () => {
    const a = taskCompletionKey({ userId: "u1", taskId: "t1", date: "2026-09-18" });
    const b = taskCompletionKey({ userId: "u1", taskId: "t1", date: "2026-09-18" });
    expect(a).toBe(b);
  });

  it("differs when the task differs", () => {
    const a = taskCompletionKey({ userId: "u1", taskId: "t1", date: "2026-09-18" });
    const b = taskCompletionKey({ userId: "u1", taskId: "t2", date: "2026-09-18" });
    expect(a).not.toBe(b);
  });

  it("differs when the date differs", () => {
    const a = taskCompletionKey({ userId: "u1", taskId: "t1", date: "2026-09-18" });
    const b = taskCompletionKey({ userId: "u1", taskId: "t1", date: "2026-09-19" });
    expect(a).not.toBe(b);
  });
});

describe("dailySyncKey", () => {
  it("coalesces multiple completions on the same day into one sync key", () => {
    const a = dailySyncKey({ userId: "u1", date: "2026-09-18" });
    const b = dailySyncKey({ userId: "u1", date: "2026-09-18" });
    expect(a).toBe(b);
  });

  it("produces a different key per day", () => {
    const a = dailySyncKey({ userId: "u1", date: "2026-09-18" });
    const b = dailySyncKey({ userId: "u1", date: "2026-09-19" });
    expect(a).not.toBe(b);
  });
});
