"use client";

import * as React from "react";
import type { Task } from "@/lib/db/schema";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea, Input, Label } from "@/components/ui/input";

export function TaskCompletionDialog({
  task,
  onClose,
  onSubmit,
}: {
  task: Task;
  onClose: () => void;
  onSubmit: (params: { whatLearned: string; notes?: string; resources?: string[] }) => Promise<void>;
}) {
  const [whatLearned, setWhatLearned] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [resourceInput, setResourceInput] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!whatLearned.trim()) {
      setError("Tell me what you learned.");
      return;
    }
    setSubmitting(true);
    const resources = resourceInput
      .split(/[\n,]/)
      .map((r) => r.trim())
      .filter(Boolean);
    await onSubmit({ whatLearned: whatLearned.trim(), notes: notes.trim() || undefined, resources });
    setSubmitting(false);
  }

  return (
    <Dialog open onClose={onClose} title={task.title}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="what-learned">What did you learn?</Label>
          <Textarea
            id="what-learned"
            autoFocus
            rows={4}
            required
            value={whatLearned}
            onChange={(e) => setWhatLearned(e.target.value)}
            placeholder="Learned how APK packages are structured."
          />
        </div>

        <div>
          <Label htmlFor="resources">Resources (optional)</Label>
          <Input
            id="resources"
            value={resourceInput}
            onChange={(e) => setResourceInput(e.target.value)}
            placeholder="https://…, one per line or comma-separated"
          />
        </div>

        <div>
          <Label htmlFor="notes">Personal notes (optional)</Label>
          <Textarea
            id="notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-accent-failed">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Completing…" : "Complete Task"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
