"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { updateSettings } from "@/server/actions/settings";

interface SettingsValues {
  syncMode: "automatic" | "manual" | "queue_until_confirmed";
  commitMessageFormat: string;
  streakRequiresGithub: boolean;
  notificationsEnabled: boolean;
}

export function SettingsForm({ initial }: { initial: SettingsValues }) {
  const [values, setValues] = React.useState(initial);
  const [saved, setSaved] = React.useState(false);

  async function save(next: Partial<SettingsValues>) {
    const merged = { ...values, ...next };
    setValues(merged);
    await updateSettings(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>GitHub</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <Label>Sync mode</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["automatic", "manual", "queue_until_confirmed"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => save({ syncMode: mode })}
                  className={`rounded-[var(--radius-interactive)] border px-3 py-2 text-xs ${
                    values.syncMode === mode
                      ? "border-accent-primary bg-[var(--accent-primary-bg)]"
                      : "border-border bg-surface-raised text-text-muted"
                  }`}
                >
                  {mode === "automatic" ? "Automatic" : mode === "manual" ? "Manual" : "Queue until confirmed"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="commit-format">Commit message format</Label>
            <Input
              id="commit-format"
              value={values.commitMessageFormat}
              onChange={(e) => setValues((v) => ({ ...v, commitMessageFormat: e.target.value }))}
              onBlur={() => save({ commitMessageFormat: values.commitMessageFormat })}
            />
            <p className="mt-1 text-xs text-text-faint">Supports {"{goal}"} and {"{date}"} placeholders.</p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={values.streakRequiresGithub}
              onChange={(e) => save({ streakRequiresGithub: e.target.checked })}
            />
            Require a successful GitHub sync to count toward my streak
          </label>
          <p className="-mt-2 text-xs text-text-faint">
            Off by default — your learning streak reflects real learning activity, independent of GitHub.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={values.notificationsEnabled}
              onChange={(e) => save({ notificationsEnabled: e.target.checked })}
            />
            Enable reminders
          </label>
        </CardContent>
      </Card>

      {saved && <p className="text-xs text-accent-synced">Saved.</p>}
    </div>
  );
}
