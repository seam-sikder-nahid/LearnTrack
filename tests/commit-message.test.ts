import { describe, it, expect } from "vitest";
import { formatCommitMessage } from "@/lib/github/commit-message";

describe("formatCommitMessage", () => {
  it("substitutes {goal} and {date}", () => {
    const msg = formatCommitMessage({
      format: "Learning: {goal} — {date}",
      goalTitle: "Android Pentesting",
      date: "2026-09-18",
    });
    expect(msg).toBe("Learning: Android Pentesting — 2026-09-18");
  });

  it("supports a custom format with reordered placeholders", () => {
    const msg = formatCommitMessage({
      format: "{date}: progress on {goal}",
      goalTitle: "Rust",
      date: "2026-01-01",
    });
    expect(msg).toBe("2026-01-01: progress on Rust");
  });
});
