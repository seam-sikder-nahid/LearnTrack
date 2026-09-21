"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";

interface JournalEntryView {
  id: string;
  date: string;
  markdown: string;
  tasksCompletedCount: number;
  tasksPlannedCount: number;
  topics: string[];
}

export function JournalBrowser({ entries }: { entries: JournalEntryView[] }) {
  const [query, setQuery] = React.useState("");
  const [openEntry, setOpenEntry] = React.useState<JournalEntryView | null>(null);

  const filtered = entries.filter((e) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      e.date.includes(q) ||
      e.topics.some((t) => t.toLowerCase().includes(q)) ||
      e.markdown.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-sm">
        <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search date, topic, or keyword…"
          className="pl-8"
          aria-label="Search journal"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((entry) => (
          <Card key={entry.id}>
            <CardContent className="flex flex-col gap-2 py-4">
              <p className="text-sm font-medium">{formatDate(entry.date)}</p>
              <p className="text-xs text-text-muted">
                {entry.tasksCompletedCount} / {entry.tasksPlannedCount} tasks completed
              </p>
              {entry.topics.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {entry.topics.map((t) => (
                    <Badge key={t} tone="neutral">{t}</Badge>
                  ))}
                </div>
              )}
              <button
                onClick={() => setOpenEntry(entry)}
                className="mt-1 self-start text-xs font-medium text-accent-primary hover:underline"
              >
                View Entry
              </button>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-text-muted">No entries match &ldquo;{query}&rdquo;.</p>
        )}
      </div>

      {openEntry && (
        <Dialog open onClose={() => setOpenEntry(null)} title={formatDate(openEntry.date)}>
          <pre className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-text">
            {openEntry.markdown}
          </pre>
        </Dialog>
      )}
    </div>
  );
}

function formatDate(dateKey: string) {
  return new Date(dateKey + "T00:00:00Z").toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
