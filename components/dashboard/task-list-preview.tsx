import Link from "next/link";
import { Circle, CircleCheck, CircleDashed, CircleSlash } from "lucide-react";
import type { Task } from "@/lib/db/schema";
import { EmptyState } from "@/components/ui/empty-state";

const STATUS_ICON = {
  pending: Circle,
  in_progress: CircleDashed,
  completed: CircleCheck,
  skipped: CircleSlash,
} as const;

export function TaskListPreview({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return <EmptyState title="No tasks today." description="Add a task or generate one from your roadmap." action={{ href: "/today", label: "Add Task" }} />;
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {tasks.map((task) => {
        const Icon = STATUS_ICON[task.status];
        return (
          <li key={task.id}>
            <Link
              href="/today"
              className="flex items-center gap-3 py-2.5 text-sm hover:text-accent-primary"
            >
              <Icon
                size={16}
                aria-hidden="true"
                className={task.status === "completed" ? "text-accent-synced" : "text-text-faint"}
              />
              <span className={task.status === "completed" ? "text-text-muted line-through" : "text-text"}>
                {task.title}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
