"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { tasks, dailyProgress, goals, milestones } from "@/lib/db/schema";
import { calculateStreak } from "@/lib/streak/calculate";
import { dateKeyRange, toDateKey, todayKey } from "@/lib/dates";

export interface GoalAnalytics {
  overallProgressPercent: number;
  milestoneProgressPercent: number;
  totalTasks: number;
  completedTasks: number;
  skippedTasks: number;
  currentStreak: number;
  longestStreak: number;
  totalLearningDays: number;
  totalEstimatedMinutes: number;
  dailyCompletionRate: number;
  weeklyCompletionRate: number;
  monthlyCompletionRate: number;
}

export async function getGoalAnalytics(userId: string, goalId: string): Promise<GoalAnalytics> {
  const [goal] = await db.select().from(goals).where(eq(goals.id, goalId)).limit(1);
  const goalTasks = await db.select().from(tasks).where(eq(tasks.goalId, goalId));
  const goalMilestones = await db.select().from(milestones).where(eq(milestones.goalId, goalId));

  const completedTasks = goalTasks.filter((t) => t.status === "completed").length;
  const skippedTasks = goalTasks.filter((t) => t.status === "skipped").length;
  const overallProgressPercent = goalTasks.length
    ? Math.round((completedTasks / goalTasks.length) * 100)
    : 0;

  const completedMilestones = goalMilestones.filter((m) => m.status === "completed").length;
  const milestoneProgressPercent = goalMilestones.length
    ? Math.round((completedMilestones / goalMilestones.length) * 100)
    : 0;

  const totalEstimatedMinutes = goalTasks
    .filter((t) => t.status === "completed")
    .reduce((sum, t) => sum + t.estimatedMinutes, 0);

  const progressRows = await db.select().from(dailyProgress).where(eq(dailyProgress.userId, userId));
  const byDate = new Map(progressRows.map((r) => [r.date, r]));

  const startKey = goal ? toDateKey(goal.startDate) : todayKey();
  const today = todayKey();
  const allDays = dateKeyRange(startKey, today).map((d) => ({
    date: d,
    countsForStreak: byDate.get(d)?.countsForStreak ?? false,
  }));
  const streak = calculateStreak(allDays);

  const last7 = allDays.slice(-7);
  const last30 = allDays.slice(-30);
  const rate = (days: typeof allDays) => {
    if (days.length === 0) return 0;
    const withPlan = days
      .map((d) => byDate.get(d.date))
      .filter((r): r is NonNullable<typeof r> => Boolean(r && r.tasksPlanned > 0));
    if (withPlan.length === 0) return 0;
    const totalPlanned = withPlan.reduce((s, r) => s + r.tasksPlanned, 0);
    const totalCompleted = withPlan.reduce((s, r) => s + r.tasksCompleted, 0);
    return totalPlanned ? Math.round((totalCompleted / totalPlanned) * 100) : 0;
  };

  const todayRow = byDate.get(today);
  const dailyCompletionRate =
    todayRow && todayRow.tasksPlanned > 0
      ? Math.round((todayRow.tasksCompleted / todayRow.tasksPlanned) * 100)
      : 0;

  return {
    overallProgressPercent,
    milestoneProgressPercent,
    totalTasks: goalTasks.length,
    completedTasks,
    skippedTasks,
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    totalLearningDays: streak.totalLearningDays,
    totalEstimatedMinutes,
    dailyCompletionRate,
    weeklyCompletionRate: rate(last7),
    monthlyCompletionRate: rate(last30),
  };
}
