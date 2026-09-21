"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, CheckCircle2, Circle, ListPlus } from "lucide-react";
import type { Milestone } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  createMilestone,
  updateMilestone,
  deleteMilestone,
} from "@/server/actions/milestones";
import { generateDailyTasksFromMilestone } from "@/server/actions/task-generator";
import { cn } from "@/lib/utils";

export function RoadmapBoard({
  goalId,
  initialMilestones,
  dailyTaskTarget,
}: {
  goalId: string;
  initialMilestones: Milestone[];
  dailyTaskTarget: number;
}) {
  const router = useRouter();
  const [milestones, setMilestones] = React.useState(initialMilestones);
  const [addingForMonth, setAddingForMonth] = React.useState<number | null>(null);
  const [generatingFor, setGeneratingFor] = React.useState<string | null>(null);

  const months = Array.from(new Set(milestones.map((m) => m.monthIndex))).sort((a, b) => a - b);
  const maxMonth = months.length > 0 ? Math.max(...months) : 0;
  const allMonths = Array.from({ length: Math.max(maxMonth, 1) }, (_, i) => i + 1);

  async function handleToggleComplete(m: Milestone) {
    const nextStatus = m.status === "completed" ? "pending" : "completed";
    await updateMilestone({ id: m.id, goalId, status: nextStatus });
    setMilestones((prev) => prev.map((x) => (x.id === m.id ? { ...x, status: nextStatus } : x)));
  }

  async function handleDelete(m: Milestone) {
    await deleteMilestone(goalId, m.id);
    setMilestones((prev) => prev.filter((x) => x.id !== m.id));
  }

  async function handleAdd(monthIndex: number, title: string) {
    const [created] = await createMilestone({ goalId, title, monthIndex });
    setMilestones((prev) => [...prev, created]);
    setAddingForMonth(null);
  }

  return (
    <div className="flex flex-col gap-6">
      {allMonths.map((monthIndex) => {
        const monthMilestones = milestones
          .filter((m) => m.monthIndex === monthIndex)
          .sort((a, b) => a.orderIndex - b.orderIndex);
        return (
          <div key={monthIndex}>
            <h2 className="mb-2 text-sm font-semibold text-text-muted">Month {monthIndex}</h2>
            <div className="flex flex-col gap-2">
              {monthMilestones.map((m) => (
                <Card key={m.id} className={cn(m.status === "completed" && "opacity-60")}>
                  <CardContent className="flex items-start gap-3 py-3">
                    <button
                      onClick={() => handleToggleComplete(m)}
                      aria-label={m.status === "completed" ? `Mark ${m.title} incomplete` : `Mark ${m.title} complete`}
                      className="mt-0.5 shrink-0"
                    >
                      {m.status === "completed" ? (
                        <CheckCircle2 size={18} className="text-accent-synced" />
                      ) : (
                        <Circle size={18} className="text-text-faint" />
                      )}
                    </button>
                    <div className="flex-1">
                      <p className={cn("text-sm font-medium", m.status === "completed" && "line-through")}>
                        {m.title}
                      </p>
                      {m.description && <p className="text-sm text-text-muted">{m.description}</p>}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setGeneratingFor(generatingFor === m.id ? null : m.id)}
                    >
                      <ListPlus size={14} /> Generate tasks
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`Delete ${m.title}`} onClick={() => handleDelete(m)}>
                      <Trash2 size={14} />
                    </Button>
                  </CardContent>
                  {generatingFor === m.id && (
                    <div className="border-t border-border px-5 py-3">
                      <GenerateTasksForm
                        goalId={goalId}
                        milestoneId={m.id}
                        dailyTaskTarget={dailyTaskTarget}
                        onDone={() => {
                          setGeneratingFor(null);
                          router.refresh();
                        }}
                      />
                    </div>
                  )}
                </Card>
              ))}

              {addingForMonth === monthIndex ? (
                <AddMilestoneForm
                  onCancel={() => setAddingForMonth(null)}
                  onAdd={(title) => handleAdd(monthIndex, title)}
                />
              ) : (
                <Button variant="ghost" size="sm" className="self-start" onClick={() => setAddingForMonth(monthIndex)}>
                  <Plus size={14} /> Add milestone
                </Button>
              )}
            </div>
          </div>
        );
      })}

      <Button
        variant="secondary"
        size="sm"
        className="self-start"
        onClick={() => setAddingForMonth(maxMonth + 1)}
      >
        <Plus size={14} /> Add month {maxMonth + 1}
      </Button>
      {addingForMonth === maxMonth + 1 && (
        <AddMilestoneForm
          onCancel={() => setAddingForMonth(null)}
          onAdd={(title) => handleAdd(maxMonth + 1, title)}
        />
      )}
    </div>
  );
}

function AddMilestoneForm({ onAdd, onCancel }: { onAdd: (title: string) => void; onCancel: () => void }) {
  const [title, setTitle] = React.useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim()) onAdd(title.trim());
      }}
      className="flex gap-2"
    >
      <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Milestone title" />
      <Button type="submit" size="sm">Add</Button>
      <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
    </form>
  );
}

function GenerateTasksForm({
  goalId,
  milestoneId,
  dailyTaskTarget,
  onDone,
}: {
  goalId: string;
  milestoneId: string;
  dailyTaskTarget: number;
  onDone: () => void;
}) {
  const [titles, setTitles] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const taskTitles = titles.split("\n").map((t) => t.trim()).filter(Boolean);
    if (taskTitles.length === 0) return;
    setSubmitting(true);
    await generateDailyTasksFromMilestone({ goalId, milestoneId, taskTitles });
    setSubmitting(false);
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <Label>
        Task titles, one per line — distributed {dailyTaskTarget} per day starting today
      </Label>
      <Textarea
        rows={4}
        value={titles}
        onChange={(e) => setTitles(e.target.value)}
        placeholder={"Learn APK anatomy\nStudy AndroidManifest.xml\nLearn APK signing basics"}
      />
      <div className="flex justify-end gap-2">
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? "Scheduling…" : "Schedule tasks"}
        </Button>
      </div>
    </form>
  );
}
