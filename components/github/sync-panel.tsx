"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { syncNow } from "@/server/actions/sync-now";

interface SyncHistoryItem {
  id: string;
  date: string;
  status: "pending" | "syncing" | "success" | "failed";
  commitMessage: string | null;
  errorMessage: string | null;
  completedAt: string | null;
}

export function GithubSyncPanel({
  username,
  repo,
  pendingCount,
  history,
}: {
  username: string | null;
  repo: { owner: string; name: string };
  pendingCount: number;
  history: SyncHistoryItem[];
}) {
  const router = useRouter();
  const [syncing, setSyncing] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  async function handleSyncNow() {
    setSyncing(true);
    setMessage(null);
    const result = await syncNow();
    setSyncing(false);
    setMessage(result.ok ? "✓ GitHub synchronized" : result.message);
    router.refresh();
  }

  const latestSuccess = history.find((h) => h.status === "success");

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Repository</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <a
              href={`https://github.com/${repo.owner}/${repo.name}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 font-mono text-sm text-accent-primary hover:underline"
            >
              github.com/{repo.owner}/{repo.name}
              <ExternalLink size={12} />
            </a>
            {username && <span className="text-xs text-text-faint">as @{username}</span>}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-text-muted">Status:</span>
            {pendingCount > 0 ? (
              <Badge tone="pending">{pendingCount} pending</Badge>
            ) : (
              <Badge tone="synced">Connected</Badge>
            )}
          </div>

          {latestSuccess && (
            <div className="text-sm">
              <p className="text-text-muted">Last commit:</p>
              <p className="font-mono text-xs">{latestSuccess.commitMessage}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleSyncNow} disabled={syncing} size="sm">
              <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Syncing…" : "Sync Now"}
            </Button>
          </div>
          {message && <p className="text-sm text-text-muted">{message}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sync history</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-text-muted">No syncs yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {history.map((h) => (
                <li key={h.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-mono text-xs text-text-muted">{h.date}</p>
                    <p>{h.commitMessage ?? h.errorMessage ?? "—"}</p>
                  </div>
                  <StatusBadge status={h.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: SyncHistoryItem["status"] }) {
  if (status === "success") return <Badge tone="synced">Synced</Badge>;
  if (status === "failed") return <Badge tone="failed">Failed</Badge>;
  if (status === "syncing") return <Badge tone="pending">Syncing…</Badge>;
  return <Badge tone="neutral">Pending</Badge>;
}
