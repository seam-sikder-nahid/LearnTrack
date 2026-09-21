"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DayActivity {
  date: string;
  tasksCompleted: number;
  minutesLearned: number;
}

function levelFor(tasksCompleted: number): 0 | 1 | 2 | 3 | 4 {
  if (tasksCompleted <= 0) return 0;
  if (tasksCompleted === 1) return 1;
  if (tasksCompleted === 2) return 2;
  if (tasksCompleted <= 4) return 3;
  return 4;
}

const LEVEL_CLASS: Record<number, string> = {
  0: "bg-surface-sunken",
  1: "bg-[var(--accent-streak-bg)]",
  2: "bg-accent-streak/40",
  3: "bg-accent-streak/70",
  4: "bg-accent-streak",
};

export function LearningHeatmap({ days }: { days: DayActivity[] }) {
  // Group into weeks (columns), Sunday-start, matching the GitHub layout
  // convention people expect — while the label above makes clear this is
  // LearnTrack's own "Learning Activity" data, not GitHub's actual graph.
  const weeks: DayActivity[][] = [];
  let currentWeek: DayActivity[] = [];

  const first = days[0] ? new Date(days[0].date + "T00:00:00Z") : null;
  if (first) {
    const leadingBlanks = first.getUTCDay();
    for (let i = 0; i < leadingBlanks; i++) {
      currentWeek.push({ date: "", tasksCompleted: -1, minutesLearned: 0 });
    }
  }

  for (const day of days) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  const totalDays = days.filter((d) => d.tasksCompleted > 0).length;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-text-muted">
        <span>{totalDays} active learning days</span>
        <div className="flex items-center gap-1">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className={cn("h-2.5 w-2.5 rounded-sm", LEVEL_CLASS[l])} />
          ))}
          <span>More</span>
        </div>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-2" role="img" aria-label="Learning activity heatmap">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day, di) =>
              day.date ? (
                <div
                  key={di}
                  title={`${day.date}: ${day.tasksCompleted} task${day.tasksCompleted === 1 ? "" : "s"} completed`}
                  className={cn("h-2.5 w-2.5 rounded-sm", LEVEL_CLASS[levelFor(day.tasksCompleted)])}
                />
              ) : (
                <div key={di} className="h-2.5 w-2.5" />
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
