"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { tasks, milestones, goals } from "@/lib/db/schema";
import { auth } from "@/lib/auth/config";

/**
 * §16 Daily Task Generator.
 *
 * Distributes a milestone's manually-authored task list across the next N
 * available days at the goal's configured daily task target. This function
 * does NOT invent task content — it only schedules tasks the user (or a
 * template — see server/seed.ts) has already written titles for. It is
 * intentionally not an "AI, make me a curriculum" feature (§40 keeps AI
 * fully optional and out of the core product), and per §16/§41 the shipped
 * seed content sticks to labs, CTFs, and defensive/theory topics rather
 * than real-world targets.
 */
const GenerateInput = z.object({
  goalId: z.string(),
  milestoneId: z.string(),
  taskTitles: z.array(z.string().min(1).max(200)).min(1).max(60),
  startDate: z.string().datetime().optional(),
});

export async function generateDailyTasksFromMilestone(
  input: z.infer<typeof GenerateInput>,
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");
  const userId = session.user.id;
  const { goalId, milestoneId, taskTitles, startDate } = GenerateInput.parse(input);

  const [goal] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, goalId), eq(goals.userId, userId)))
    .limit(1);
  if (!goal) throw new Error("GOAL_NOT_FOUND_OR_FORBIDDEN");

  const [milestone] = await db
    .select()
    .from(milestones)
    .where(and(eq(milestones.id, milestoneId), eq(milestones.goalId, goalId)))
    .limit(1);
  if (!milestone) throw new Error("MILESTONE_NOT_FOUND");

  const dailyTarget = goal.dailyTaskTarget || 1;
  const base = startDate ? new Date(startDate) : new Date();

  const rows = taskTitles.map((title, i) => {
    const dayOffset = Math.floor(i / dailyTarget);
    const scheduledDate = new Date(base);
    scheduledDate.setDate(scheduledDate.getDate() + dayOffset);
    return {
      userId,
      goalId,
      milestoneId,
      title,
      category: milestone.title,
      scheduledDate,
      orderIndex: i % dailyTarget,
    };
  });

  return db.insert(tasks).values(rows).returning();
}
