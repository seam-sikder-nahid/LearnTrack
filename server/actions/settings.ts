"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { userSettings } from "@/lib/db/schema";
import { auth } from "@/lib/auth/config";

const UpdateSettingsInput = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  syncMode: z.enum(["automatic", "manual", "queue_until_confirmed"]).optional(),
  commitMessageFormat: z.string().min(1).max(200).optional(),
  streakRequiresGithub: z.boolean().optional(),
  notificationsEnabled: z.boolean().optional(),
});

export async function updateSettings(input: z.infer<typeof UpdateSettingsInput>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");
  const parsed = UpdateSettingsInput.parse(input);

  await db
    .insert(userSettings)
    .values({ userId: session.user.id, ...parsed })
    .onConflictDoUpdate({ target: userSettings.userId, set: parsed });
}

export async function getSettings(userId: string) {
  const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  return settings ?? null;
}
