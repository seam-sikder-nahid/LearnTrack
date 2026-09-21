"use server";

import { z } from "zod";
import { and, eq, asc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { milestones, goals } from "@/lib/db/schema";
import { auth } from "@/lib/auth/config";

async function requireOwnedGoal(userId: string, goalId: string) {
  const [goal] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, goalId), eq(goals.userId, userId)))
    .limit(1);
  if (!goal) throw new Error("GOAL_NOT_FOUND_OR_FORBIDDEN");
  return goal;
}

const CreateMilestoneInput = z.object({
  goalId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  monthIndex: z.number().int().positive(),
  deadline: z.string().datetime().optional(),
});

export async function createMilestone(input: z.infer<typeof CreateMilestoneInput>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");
  const parsed = CreateMilestoneInput.parse(input);
  await requireOwnedGoal(session.user.id, parsed.goalId);

  const existing = await db
    .select()
    .from(milestones)
    .where(eq(milestones.goalId, parsed.goalId));

  return db
    .insert(milestones)
    .values({
      goalId: parsed.goalId,
      title: parsed.title,
      description: parsed.description ?? null,
      monthIndex: parsed.monthIndex,
      orderIndex: existing.length,
      deadline: parsed.deadline ? new Date(parsed.deadline) : null,
    })
    .returning();
}

const UpdateMilestoneInput = z.object({
  id: z.string(),
  goalId: z.string(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(["pending", "in_progress", "completed"]).optional(),
  deadline: z.string().datetime().nullable().optional(),
});

export async function updateMilestone(input: z.infer<typeof UpdateMilestoneInput>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");
  const parsed = UpdateMilestoneInput.parse(input);
  await requireOwnedGoal(session.user.id, parsed.goalId);

  const { deadline, title, description, status } = parsed;
  return db
    .update(milestones)
    .set({
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(deadline !== undefined ? { deadline: deadline ? new Date(deadline) : null } : {}),
    })
    .where(eq(milestones.id, parsed.id))
    .returning();
}

export async function deleteMilestone(goalId: string, milestoneId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");
  await requireOwnedGoal(session.user.id, goalId);
  await db.delete(milestones).where(eq(milestones.id, milestoneId));
}

export async function reorderMilestones(goalId: string, orderedIds: string[]) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");
  await requireOwnedGoal(session.user.id, goalId);

  await Promise.all(
    orderedIds.map((id, index) =>
      db.update(milestones).set({ orderIndex: index }).where(eq(milestones.id, id)),
    ),
  );
}

export async function listMilestones(goalId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");
  await requireOwnedGoal(session.user.id, goalId);
  return db
    .select()
    .from(milestones)
    .where(eq(milestones.goalId, goalId))
    .orderBy(asc(milestones.orderIndex));
}
