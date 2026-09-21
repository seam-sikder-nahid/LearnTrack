import { auth } from "@/lib/auth/config";
import { getActiveGoal } from "@/server/actions/current-goal";
import { listMilestones } from "@/server/actions/milestones";
import { EmptyState } from "@/components/ui/empty-state";
import { RoadmapBoard } from "@/components/roadmap/roadmap-board";

export default async function RoadmapPage() {
  const session = await auth();
  const userId = session!.user.id;
  const goal = await getActiveGoal(userId);

  if (!goal) {
    return (
      <EmptyState
        title="No learning goals yet."
        description="Create a goal first to start building a roadmap."
        action={{ href: "/onboarding", label: "Create Your First Goal" }}
      />
    );
  }

  const milestones = await listMilestones(goal.id);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">{goal.title} — Roadmap</h1>
        <p className="mt-1 text-sm text-text-muted">
          {goal.durationDays} days · {milestones.length} milestone{milestones.length === 1 ? "" : "s"}
        </p>
      </header>
      <RoadmapBoard goalId={goal.id} initialMilestones={milestones} dailyTaskTarget={goal.dailyTaskTarget} />
    </div>
  );
}
