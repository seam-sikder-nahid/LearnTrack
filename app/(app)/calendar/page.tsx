import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { dailyProgress } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getActiveGoal } from "@/server/actions/current-goal";
import { EmptyState } from "@/components/ui/empty-state";
import { LearningHeatmap } from "@/components/calendar/heatmap";
import { dateKeyRange, toDateKey } from "@/lib/dates";

export default async function CalendarPage() {
  const session = await auth();
  const userId = session!.user.id;
  const goal = await getActiveGoal(userId);

  if (!goal) {
    return (
      <EmptyState
        title="No learning goals yet."
        description="Create a goal to start tracking your daily learning activity."
        action={{ href: "/onboarding", label: "Create Your First Goal" }}
      />
    );
  }

  const progressRows = await db.select().from(dailyProgress).where(eq(dailyProgress.userId, userId));
  const byDate = new Map(progressRows.map((r) => [r.date, r]));

  const startKey = toDateKey(goal.startDate);
  const today = toDateKey(new Date());
  const days = dateKeyRange(startKey, today).map((date) => ({
    date,
    tasksCompleted: byDate.get(date)?.tasksCompleted ?? 0,
    minutesLearned: byDate.get(date)?.minutesLearned ?? 0,
  }));

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Calendar</h1>
        <p className="mt-1 text-sm text-text-muted">
          Learning Activity — not GitHub&apos;s contribution graph.
        </p>
      </header>
      <LearningHeatmap days={days} />
    </div>
  );
}
