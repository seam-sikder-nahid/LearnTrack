import { auth } from "@/lib/auth/config";
import { getTodaysTasks } from "@/server/actions/tasks";
import { getActiveGoal } from "@/server/actions/current-goal";
import { EmptyState } from "@/components/ui/empty-state";
import { TodayTaskList } from "@/components/tasks/today-task-list";
import { todayKey } from "@/lib/dates";

export default async function TodayPage() {
  const session = await auth();
  const userId = session!.user.id;
  const goal = await getActiveGoal(userId);
  const tasks = await getTodaysTasks(userId);

  const dateLabel = new Date(todayKey() + "T00:00:00Z").toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-text-faint">{dateLabel}</p>
        <h1 className="mt-0.5 text-xl font-semibold tracking-tight">{goal?.title ?? "Today's Tasks"}</h1>
      </header>

      {tasks.length === 0 ? (
        <EmptyState
          title="No tasks today."
          description="Generate tasks from your roadmap, or add one manually."
          action={{ href: "/roadmap", label: "Go to Roadmap" }}
        />
      ) : (
        <TodayTaskList initialTasks={tasks} />
      )}
    </div>
  );
}
