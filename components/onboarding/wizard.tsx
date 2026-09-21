"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { completeOnboarding } from "@/server/actions/onboarding";
import { fetchUserRepositories } from "@/server/actions/github-repos";

type DurationOption = 30 | 90 | 180 | 365 | "custom";
type RepoChoice =
  | { mode: "existing"; owner: string; name: string; defaultBranch: string }
  | { mode: "new"; name: string; isPrivate: boolean }
  | { mode: "skip" };

const STEPS = [
  "welcome",
  "goal",
  "duration",
  "repository",
  "visibility",
  "workload",
  "finish",
] as const;

export function OnboardingWizard() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = React.useState(0);
  const [goalTitle, setGoalTitle] = React.useState("");
  const [duration, setDuration] = React.useState<DurationOption>(90);
  const [customDays, setCustomDays] = React.useState(60);
  const [repoChoice, setRepoChoice] = React.useState<RepoChoice>({ mode: "skip" });
  const [newRepoName, setNewRepoName] = React.useState("learning-journal");
  const [isPrivate, setIsPrivate] = React.useState(true);
  const [dailyTarget, setDailyTarget] = React.useState(2);
  const [repos, setRepos] = React.useState<
    { owner: string; name: string; fullName: string; defaultBranch: string }[] | null
  >(null);
  const [reposError, setReposError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const step = STEPS[stepIndex];
  const durationDays = duration === "custom" ? customDays : duration;

  React.useEffect(() => {
    if (step === "repository" && repos === null) {
      fetchUserRepositories()
        .then(setRepos)
        .catch(() => setReposError("Couldn't load your GitHub repositories. You can still create a new one or skip for now."));
    }
  }, [step, repos]);

  async function handleFinish() {
    setSubmitting(true);
    setError(null);
    const finalRepoChoice: RepoChoice =
      repoChoice.mode === "new" ? { ...repoChoice, name: newRepoName, isPrivate } : repoChoice;

    const result = await completeOnboarding({
      goalTitle,
      durationDays,
      dailyTaskTarget: dailyTarget,
      repository: finalRepoChoice,
    });

    if (!result.ok) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
    router.push("/dashboard");
  }

  function next() {
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }
  function back() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  return (
    <Card className="w-full max-w-md">
      <CardContent className="py-8">
        <div className="mb-6 flex gap-1.5" aria-hidden="true">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={cn(
                "h-1 flex-1 rounded-full",
                i <= stepIndex ? "bg-accent-primary" : "bg-surface-sunken",
              )}
            />
          ))}
        </div>

        {step === "welcome" && (
          <StepShell
            title="Welcome to LearnTrack"
            description="A few quick questions to set up your first learning goal."
          >
            <Button onClick={next} className="w-full">
              Get started
            </Button>
          </StepShell>
        )}

        {step === "goal" && (
          <StepShell title="What are you learning?" description='Example: "Android Pentesting"'>
            <Label htmlFor="goal-title">Learning goal</Label>
            <Input
              id="goal-title"
              autoFocus
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              placeholder="Android Pentesting"
            />
            <NavButtons onBack={back} onNext={next} nextDisabled={!goalTitle.trim()} />
          </StepShell>
        )}

        {step === "duration" && (
          <StepShell title="How long is your learning goal?">
            <div className="grid grid-cols-2 gap-2">
              {[30, 90, 180, 365].map((d) => (
                <OptionButton key={d} selected={duration === d} onClick={() => setDuration(d as DurationOption)}>
                  {d === 30 ? "30 days" : d === 90 ? "3 months" : d === 180 ? "6 months" : "12 months"}
                </OptionButton>
              ))}
              <OptionButton selected={duration === "custom"} onClick={() => setDuration("custom")}>
                Custom
              </OptionButton>
            </div>
            {duration === "custom" && (
              <Input
                type="number"
                min={1}
                className="mt-3"
                value={customDays}
                onChange={(e) => setCustomDays(Number(e.target.value))}
                aria-label="Custom number of days"
              />
            )}
            <NavButtons onBack={back} onNext={next} />
          </StepShell>
        )}

        {step === "repository" && (
          <StepShell
            title="Target GitHub repository"
            description="Choose where your learning journal will be committed."
          >
            <div className="flex flex-col gap-2">
              <OptionButton
                selected={repoChoice.mode === "new"}
                onClick={() => setRepoChoice({ mode: "new", name: newRepoName, isPrivate })}
              >
                Create a new repository
              </OptionButton>
              {repoChoice.mode === "new" && (
                <Input
                  value={newRepoName}
                  onChange={(e) => setNewRepoName(e.target.value)}
                  placeholder="learning-journal"
                  aria-label="New repository name"
                  className="ml-1"
                />
              )}

              <div className="mt-2">
                <p className="mb-1.5 text-xs font-medium text-text-muted">
                  Or select an existing repository
                </p>
                {reposError && <p className="text-xs text-accent-failed">{reposError}</p>}
                {repos === null && !reposError && (
                  <p className="text-xs text-text-faint">Loading your repositories…</p>
                )}
                {repos && repos.length === 0 && (
                  <p className="text-xs text-text-faint">No repositories found.</p>
                )}
                <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
                  {repos?.map((r) => (
                    <OptionButton
                      key={r.fullName}
                      selected={repoChoice.mode === "existing" && repoChoice.name === r.name}
                      onClick={() =>
                        setRepoChoice({
                          mode: "existing",
                          owner: r.owner,
                          name: r.name,
                          defaultBranch: r.defaultBranch,
                        })
                      }
                    >
                      {r.fullName}
                    </OptionButton>
                  ))}
                </div>
              </div>

              <OptionButton selected={repoChoice.mode === "skip"} onClick={() => setRepoChoice({ mode: "skip" })}>
                Skip for now
              </OptionButton>
            </div>
            <NavButtons onBack={back} onNext={next} />
          </StepShell>
        )}

        {step === "visibility" && (
          <StepShell title="Repository visibility">
            {repoChoice.mode !== "new" ? (
              <p className="text-sm text-text-muted">
                Only applies when creating a new repository — skipping this step.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <OptionButton selected={isPrivate} onClick={() => setIsPrivate(true)}>
                  Private
                </OptionButton>
                <OptionButton selected={!isPrivate} onClick={() => setIsPrivate(false)}>
                  Public
                </OptionButton>
              </div>
            )}
            <NavButtons onBack={back} onNext={next} />
          </StepShell>
        )}

        {step === "workload" && (
          <StepShell title="Preferred daily workload">
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 5].map((n) => (
                <OptionButton key={n} selected={dailyTarget === n} onClick={() => setDailyTarget(n)}>
                  {n} task{n > 1 ? "s" : ""}
                </OptionButton>
              ))}
            </div>
            <Label className="mt-3">Or a custom number</Label>
            <Input
              type="number"
              min={1}
              value={dailyTarget}
              onChange={(e) => setDailyTarget(Number(e.target.value))}
            />
            <NavButtons onBack={back} onNext={next} />
          </StepShell>
        )}

        {step === "finish" && (
          <StepShell
            title="You're all set"
            description={`"${goalTitle}" · ${durationDays} days · ${dailyTarget} task${dailyTarget > 1 ? "s" : ""}/day`}
          >
            {error && <p className="mb-3 text-sm text-accent-failed">{error}</p>}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={back} disabled={submitting}>
                Back
              </Button>
              <Button onClick={handleFinish} disabled={submitting} className="flex-1">
                {submitting ? "Setting up…" : "Create my dashboard"}
              </Button>
            </div>
          </StepShell>
        )}
      </CardContent>
    </Card>
  );
}

function StepShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      {description && <p className="mt-1 text-sm text-text-muted">{description}</p>}
      <div className="mt-5 flex flex-col gap-3">{children}</div>
    </div>
  );
}

function NavButtons({
  onBack,
  onNext,
  nextDisabled,
}: {
  onBack: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
}) {
  return (
    <div className="mt-2 flex gap-2">
      <Button variant="secondary" onClick={onBack}>
        Back
      </Button>
      <Button onClick={onNext} disabled={nextDisabled} className="flex-1">
        Continue
      </Button>
    </div>
  );
}

function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-[var(--radius-interactive)] border px-3 py-2 text-left text-sm transition-colors",
        selected
          ? "border-accent-primary bg-[var(--accent-primary-bg)] text-text"
          : "border-border bg-surface-raised text-text-muted hover:bg-surface-sunken",
      )}
    >
      {children}
    </button>
  );
}
