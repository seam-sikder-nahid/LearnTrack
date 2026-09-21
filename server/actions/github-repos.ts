"use server";

import { auth } from "@/lib/auth/config";
import { getGithubAccessToken } from "@/lib/github/token";
import { listUserRepositories } from "@/lib/github/sync-engine";

export async function fetchUserRepositories() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");
  const token = await getGithubAccessToken(session.user.id);
  return listUserRepositories(token);
}
