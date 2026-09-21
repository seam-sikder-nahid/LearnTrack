import "server-only";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { accounts } from "@/lib/db/schema";

/**
 * The ONLY function in the codebase allowed to read a raw GitHub access
 * token out of the database. Every server action / route handler that needs
 * to call the GitHub API goes through this function; nothing else selects
 * `accounts.access_token` directly. This keeps §5's "never expose access
 * tokens" and §30's "never log tokens" enforceable at a single choke point.
 *
 * Never call this from client components — the `server-only` import makes
 * that a build error, not just a convention.
 */
export async function getGithubAccessToken(userId: string): Promise<string> {
  const [account] = await db
    .select({ access_token: accounts.access_token })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, "github")))
    .limit(1);

  if (!account?.access_token) {
    throw new Error("NO_GITHUB_CONNECTION");
  }
  return account.access_token;
}
