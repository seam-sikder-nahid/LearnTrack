"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Clock, SkipForward } from "lucide-react";
import type { Task } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { completeTask } from "@/server/actions/complete-task";
import { skipTask } from "@/server/actions/tasks";
import { TaskCompletionDialog } from "./task-completion-dialog";
import { cn } from "@/lib/utils";

const DIFFICULTY_TONE = {
  easy: "synced",
  medium: "pending",
  hard: "failed",
} as const;

export function TodayTaskList({ initialTasks }: { initialTasks: Task[] }) {
  const router = useRouter();
  const [tasks, setTasks] = React.useState(initialTasks);
  const [activeTask, setActiveTask] = React.useState<Task | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);

  async function handleSkip(task: Task) {
    await skipTask(task.id);
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: "skipped" } : t)));
  }

  async function handleCompleted(params: { whatLearned: string; notes?: string; resources?: string[] }) {
    if (!activeTask) return;
    const result = await completeTask({ taskId: activeTask.id, ...params });
    setActiveTask(null);
    if (result.ok) {
      setTasks((prev) =>
        prev.map((t) => (t.id === activeTask.id ? { ...t, status: "completed" } : t)),
      );
      setToast(
        result.syncQueued
          ? "✓ Task completed — Learning journal updated — GitHub sync queued"
          : "✓ Task completed — Learning journal updated",
      );
      router.refresh();
    } else {
      setToast(`Something went wrong: ${result.error}`);
    }
    setTimeout(() => setToast(null), 5000);
  }

  return (
    <div>
      <ul className="flex flex-col gap-2">
        {tasks.map((task) => (
          <li
            key={task.id}
            className={cn(
              "flex items-start gap-3 rounded-[var(--radius-structural)] border border-border bg-surface-raised p-4",
              task.status === "completed" && "opacity-70",
              task.status === "skipped" && "opacity-50",
            )}
          >
            <button
              onClick={() => task.status === "pending" && setActiveTask(task)}
              disabled={task.status !== "pending"}
              aria-label={
                task.status === "completed"
                  ? `${task.title} — completed`
                  : `Mark ${task.title} as complete`
              }
              className="mt-0.5 shrink-0 text-text-faint disabled:cursor-default"
            >
              {task.status === "completed" ? (
                <CheckCircle2 size={20} className="text-accent-synced" />
              ) : (
                <Circle size={20} className="hover:text-accent-primary" />
              )}
            </button>

            <div className="flex-1">
              <p
                className={cn(
                  "text-sm font-medium text-text",
                  task.status === "completed" && "line-through",
                )}
              >
                {task.title}
              </p>
              {task.description && (
                <p className="mt-0.5 text-sm text-text-muted">{task.description}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {task.category && <Badge tone="neutral">{task.category}</Badge>}
                <Badge tone={DIFFICULTY_TONE[task.difficulty]}>{task.difficulty}</Badge>
                <span className="inline-flex items-center gap-1 text-xs text-text-faint">
                  <Clock size={12} aria-hidden="true" />
                  {task.estimatedMinutes} min
                </span>
              </div>
            </div>

            {task.status === "pending" && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Skip ${task.title}`}
                onClick={() => handleSkip(task)}
              >
                <SkipForward size={16} />
              </Button>
            )}
          </li>
        ))}
      </ul>

      {activeTask && (
        <TaskCompletionDialog
          task={activeTask}
          onClose={() => setActiveTask(null)}
          onSubmit={handleCompleted}
        />
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 rounded-[var(--radius-interactive)] border border-border bg-surface-raised px-4 py-2 text-sm shadow-lg md:bottom-6"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
