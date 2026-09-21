import { auth } from "@/lib/auth/config";
import { getActiveGoal, getGoalRepository } from "@/server/actions/current-goal";
import { listPendingSyncs } from "@/server/actions/sync-queue";
import { db } from "@/lib/db/client";
import { githubSyncs, githubConnections } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { EmptyState } from "@/components/ui/empty-state";
import { GithubSyncPanel } from "@/components/github/sync-panel";

export default async function GithubSyncPage() {
  const session = await auth();
  const userId = session!.user.id;
  const goal = await getActiveGoal(userId);
  const [connection] = await db
    .select()
    .from(githubConnections)
    .where(eq(githubConnections.userId, userId))
    .limit(1);

  const repo = goal ? await getGoalRepository(goal.id) : null;
  const pending = await listPendingSyncs(userId);
  const history = await db
    .select()
    .from(githubSyncs)
    .where(eq(githubSyncs.userId, userId))
    .orderBy(desc(githubSyncs.createdAt))
    .limit(20);

  if (!repo) {
    return (
      <EmptyState
        title="No GitHub repository connected."
        description="Connect a repository to start syncing your learning journal."
        action={{ href: "/onboarding", label: "Connect GitHub" }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">GitHub Sync</h1>
      </header>
      <GithubSyncPanel
        username={connection?.githubUsername ?? null}
        repo={{ owner: repo.owner, name: repo.name }}
        pendingCount={pending.length}
        history={history.map((h) => ({
          id: h.id,
          date: h.date,
          status: h.status,
          commitMessage: h.commitMessage,
          errorMessage: h.errorMessage,
          completedAt: h.completedAt ? h.completedAt.toISOString() : null,
        }))}
      />
    </div>
  );
}
