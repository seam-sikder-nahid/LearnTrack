"use server";

import { z } from "zod";
import { db } from "@/lib/db/client";
import { goals, githubRepositories, userSettings } from "@/lib/db/schema";
import { auth } from "@/lib/auth/config";
import { getGithubAccessToken } from "@/lib/github/token";
import { createRepository } from "@/lib/github/sync-engine";
import { eq } from "drizzle-orm";

/**
 * §6 First-Time Setup wizard, submitted as one action once the user
 * finishes all steps (each step is just client-side state until here —
 * nothing is half-created server-side if they abandon the wizard).
 */
const OnboardingInput = z.object({
  goalTitle: z.string().min(1).max(200),
  durationDays: z.number().int().positive().max(3650),
  dailyTaskTarget: z.number().int().positive().max(20),
  repository: z.union([
    z.object({ mode: z.literal("existing"), owner: z.string(), name: z.string(), defaultBranch: z.string() }),
    z.object({ mode: z.literal("new"), name: z.string().min(1).max(100), isPrivate: z.boolean() }),
    z.object({ mode: z.literal("skip") }),
  ]),
});

export type OnboardingResult =
  | { ok: true; goalId: string }
  | { ok: false; error: string };

export async function completeOnboarding(
  input: z.infer<typeof OnboardingInput>,
): Promise<OnboardingResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "UNAUTHENTICATED" };
  const userId = session.user.id;

  const parsed = OnboardingInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "INVALID_INPUT" };
  }
  const { goalTitle, durationDays, dailyTaskTarget, repository } = parsed.data;

  const startDate = new Date();
  const targetDate = new Date(startDate);
  targetDate.setDate(targetDate.getDate() + durationDays);

  const [goal] = await db
    .insert(goals)
    .values({ userId, title: goalTitle, durationDays, startDate, targetDate, dailyTaskTarget })
    .returning();

  if (repository.mode === "new") {
    try {
      const accessToken = await getGithubAccessToken(userId);
      const created = await createRepository({
        accessToken,
        name: repository.name,
        isPrivate: repository.isPrivate,
      });
      await db.insert(githubRepositories).values({
        userId,
        goalId: goal.id,
        owner: created.owner,
        name: created.repo,
        fullName: `${created.owner}/${created.repo}`,
        defaultBranch: created.defaultBranch,
        isPrivate: repository.isPrivate,
        wasCreatedByApp: true,
      });
    } catch {
      // Repository creation failing must not block goal creation — the
      // user can connect/create a repository later from GitHub Sync
      // settings (§19 "[Change Repository]"). Learning still works fully
      // offline of GitHub per §2/§14.
    }
  } else if (repository.mode === "existing") {
    await db.insert(githubRepositories).values({
      userId,
      goalId: goal.id,
      owner: repository.owner,
      name: repository.name,
      fullName: `${repository.owner}/${repository.name}`,
      defaultBranch: repository.defaultBranch,
      isPrivate: true,
      wasCreatedByApp: false,
    });
  }

  await db
    .insert(userSettings)
    .values({ userId, hasCompletedOnboarding: true })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { hasCompletedOnboarding: true },
    });

  return { ok: true, goalId: goal.id };
}

export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  const [settings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  return settings?.hasCompletedOnboarding ?? false;
}
