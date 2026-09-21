import { describe, it, expect } from "vitest";
import { calculateStreak, type StreakDay } from "@/lib/streak/calculate";

function days(pattern: string, startDate = "2026-09-01"): StreakDay[] {
  // pattern like "1101 1" where 1 = counts, 0 = doesn't. Spaces ignored.
  const flags = pattern.replace(/\s/g, "").split("").map((c) => c === "1");
  const start = new Date(startDate + "T00:00:00Z");
  return flags.map((f, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    return { date: d.toISOString().slice(0, 10), countsForStreak: f };
  });
}

describe("calculateStreak", () => {
  it("returns zeros for no days", () => {
    expect(calculateStreak([])).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      totalLearningDays: 0,
    });
  });

  it("counts a simple unbroken streak", () => {
    const result = calculateStreak(days("11111"));
    expect(result.currentStreak).toBe(5);
    expect(result.longestStreak).toBe(5);
    expect(result.totalLearningDays).toBe(5);
  });

  it("resets current streak after a gap, keeps longest", () => {
    const result = calculateStreak(days("111001"));
    expect(result.longestStreak).toBe(3);
    expect(result.currentStreak).toBe(1);
    expect(result.totalLearningDays).toBe(4);
  });

  it("does not zero the current streak just because 'today' is empty", () => {
    // yesterday and the day before count, today (last day) doesn't yet.
    const result = calculateStreak(days("11110"));
    expect(result.currentStreak).toBe(4);
  });

  it("returns 0 current streak if the streak broke before today", () => {
    const result = calculateStreak(days("1101"));
    // day pattern: 1,1,0,1 -> last day counts alone, streak of 1
    expect(result.currentStreak).toBe(1);
  });

  it("returns 0 current streak for an all-empty range", () => {
    const result = calculateStreak(days("0000"));
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(0);
  });

  it("handles empty-then-broken correctly (no false positive streak)", () => {
    // Last day empty AND the day before also empty -> current streak must be 0
    const result = calculateStreak(days("11100"));
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(3);
  });
});
