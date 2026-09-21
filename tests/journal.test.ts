import { describe, it, expect } from "vitest";
import { generateJournalMarkdown, deriveTopics } from "@/lib/journal/generate";

describe("generateJournalMarkdown", () => {
  it("only includes user-provided content, never fabricated text", () => {
    const md = generateJournalMarkdown({
      date: "2026-09-18",
      goalTitle: "Android Pentesting",
      tasksPlannedCount: 4,
      completedTasks: [
        {
          title: "Study APK Structure",
          category: "Static Analysis",
          whatLearned: "Learned how APK packages are structured.",
          notes: "Used a sample APK from an intentionally vulnerable app.",
          resources: ["https://example.com/apk-guide"],
        },
      ],
    });

    expect(md).toContain("# Learning Log — 2026-09-18");
    expect(md).toContain("Android Pentesting");
    expect(md).toContain("Study APK Structure");
    expect(md).toContain("Learned how APK packages are structured.");
    expect(md).toContain("https://example.com/apk-guide");
    expect(md).toContain("1 / 4 tasks completed");
  });

  it("shows honest empty states rather than inventing content", () => {
    const md = generateJournalMarkdown({
      date: "2026-09-18",
      goalTitle: "Android Pentesting",
      tasksPlannedCount: 3,
      completedTasks: [],
    });

    expect(md).toContain("_No tasks completed yet today._");
    expect(md).toContain("_Nothing recorded yet._");
    expect(md).toContain("0 / 3 tasks completed");
  });

  it("omits the Notes section entirely when no notes were written", () => {
    const md = generateJournalMarkdown({
      date: "2026-09-18",
      goalTitle: "Android Pentesting",
      tasksPlannedCount: 1,
      completedTasks: [
        {
          title: "Practice ADB",
          category: "Fundamentals",
          whatLearned: "ADB basics.",
          notes: null,
          resources: [],
        },
      ],
    });
    expect(md).not.toContain("## Notes");
  });
});

describe("deriveTopics", () => {
  it("deduplicates categories", () => {
    const topics = deriveTopics([
      { title: "A", category: "APK", whatLearned: "x", notes: null, resources: [] },
      { title: "B", category: "APK", whatLearned: "x", notes: null, resources: [] },
      { title: "C", category: "ADB", whatLearned: "x", notes: null, resources: [] },
    ]);
    expect(topics).toEqual(["APK", "ADB"]);
  });
});
