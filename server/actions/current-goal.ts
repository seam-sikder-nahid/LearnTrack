"use server";

import { and, eq, desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { goals, githubRepositories } from "@/lib/db/schema";

export async function getActiveGoal(userId: string) {
  const [goal] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.userId, userId), eq(goals.status, "active")))
    .orderBy(desc(goals.createdAt))
    .limit(1);
  return goal ?? null;
}

export async function getGoalRepository(goalId: string) {
  const [repo] = await db
    .select()
    .from(githubRepositories)
    .where(and(eq(githubRepositories.goalId, goalId), eq(githubRepositories.isActive, true)))
    .limit(1);
  return repo ?? null;
}
