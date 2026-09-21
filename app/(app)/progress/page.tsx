import { auth } from "@/lib/auth/config";
import { getActiveGoal } from "@/server/actions/current-goal";
import { getGoalAnalytics } from "@/server/actions/analytics";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default async function ProgressPage() {
  const session = await auth();
  const userId = session!.user.id;
  const goal = await getActiveGoal(userId);

  if (!goal) {
    return (
      <EmptyState
        title="No learning goals yet."
        description="Create a goal to see your progress analytics."
        action={{ href: "/onboarding", label: "Create Your First Goal" }}
      />
    );
  }

  const a = await getGoalAnalytics(userId, goal.id);

  const stats = [
    { label: "Overall progress", value: `${a.overallProgressPercent}%` },
    { label: "Milestone progress", value: `${a.milestoneProgressPercent}%` },
    { label: "Daily completion rate", value: `${a.dailyCompletionRate}%` },
    { label: "Weekly completion rate", value: `${a.weeklyCompletionRate}%` },
    { label: "Monthly completion rate", value: `${a.monthlyCompletionRate}%` },
    { label: "Total tasks", value: a.totalTasks },
    { label: "Completed tasks", value: a.completedTasks },
    { label: "Skipped tasks", value: a.skippedTasks },
    { label: "Learning days", value: a.totalLearningDays },
    { label: "Current streak", value: a.currentStreak },
    { label: "Longest streak", value: a.longestStreak },
    { label: "Est. learning time", value: `${Math.round(a.totalEstimatedMinutes / 60)} hrs` },
  ];

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Progress</h1>
        <p className="mt-1 text-sm text-text-muted">{goal.title}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Overall</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={a.overallProgressPercent} />
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="py-4">
              <p className="text-xs text-text-muted">{s.label}</p>
              <p className="mt-1 text-xl font-semibold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
