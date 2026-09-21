import Link from "next/link";
import { Flame, GitBranch } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { getActiveGoal, getGoalRepository } from "@/server/actions/current-goal";
import { getGoalAnalytics } from "@/server/actions/analytics";
import { getTodaysTasks } from "@/server/actions/tasks";
import { listPendingSyncs } from "@/server/actions/sync-queue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TaskListPreview } from "@/components/dashboard/task-list-preview";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const goal = await getActiveGoal(userId);

  if (!goal) {
    return (
      <EmptyState
        title="No learning goals yet."
        description="Create your first learning goal to start tracking daily tasks and building your GitHub history."
        action={{ href: "/onboarding", label: "Create Your First Goal" }}
      />
    );
  }

  const [analytics, todaysTasks, repo, pendingSyncs] = await Promise.all([
    getGoalAnalytics(userId, goal.id),
    getTodaysTasks(userId),
    getGoalRepository(goal.id),
    listPendingSyncs(userId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-medium text-text-faint">Current goal</p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">{goal.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone="streak">
            <Flame size={13} aria-hidden="true" />
            {analytics.currentStreak} Day Learning Streak
          </Badge>
          <Badge tone="primary">{analytics.overallProgressPercent}% Overall Progress</Badge>
          <SyncStatusBadge connected={Boolean(repo)} pendingCount={pendingSyncs.length} />
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Overall progress</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={analytics.overallProgressPercent} />
            <p className="mt-2 text-xs text-text-muted">
              {analytics.completedTasks} / {analytics.totalTasks} tasks completed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Learning streak</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{analytics.currentStreak}</p>
            <p className="text-xs text-text-muted">Longest: {analytics.longestStreak} days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>GitHub sync</CardTitle>
          </CardHeader>
          <CardContent>
            {repo ? (
              <>
                <p className="truncate font-mono text-sm">{repo.owner}/{repo.name}</p>
                <p className="text-xs text-text-muted">
                  {pendingSyncs.length > 0 ? `${pendingSyncs.length} pending` : "Up to date"}
                </p>
              </>
            ) : (
              <Link href="/github" className="text-sm text-accent-primary hover:underline">
                Connect a repository →
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Today&apos;s Tasks</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/today">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <TaskListPreview tasks={todaysTasks} />
        </CardContent>
      </Card>
    </div>
  );
}

function SyncStatusBadge({ connected, pendingCount }: { connected: boolean; pendingCount: number }) {
  if (!connected) return <Badge tone="neutral"><GitBranch size={13} aria-hidden="true" />Not connected</Badge>;
  if (pendingCount > 0) return <Badge tone="pending"><GitBranch size={13} aria-hidden="true" />{pendingCount} pending</Badge>;
  return <Badge tone="synced"><GitBranch size={13} aria-hidden="true" />Synced</Badge>;
}
