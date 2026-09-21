/**
 * progress.json + README.md generation (§11).
 * Only derived, non-sensitive metadata goes into the repo — no tokens, no
 * user emails, no internal IDs.
 */

export interface ProgressFileInput {
  goalTitle: string;
  startDate: string; // YYYY-MM-DD
  targetDate: string; // YYYY-MM-DD
  overallProgressPercent: number;
  currentStreak: number;
  longestStreak: number;
  totalLearningDays: number;
  totalTasksCompleted: number;
  milestones: { title: string; status: string }[];
  updatedAt: string; // ISO timestamp
}

export function generateProgressJson(input: ProgressFileInput): string {
  return JSON.stringify(
    {
      goal: input.goalTitle,
      startDate: input.startDate,
      targetDate: input.targetDate,
      overallProgressPercent: input.overallProgressPercent,
      streak: {
        current: input.currentStreak,
        longest: input.longestStreak,
      },
      totalLearningDays: input.totalLearningDays,
      totalTasksCompleted: input.totalTasksCompleted,
      milestones: input.milestones,
      updatedAt: input.updatedAt,
      generatedBy: "LearnTrack",
    },
    null,
    2,
  );
}

export function generateReadme(input: ProgressFileInput): string {
  const milestoneLines = input.milestones
    .map((m) => `- [${m.status === "completed" ? "x" : " "}] ${m.title}`)
    .join("\n");

  return `# Learning Journal — ${input.goalTitle}

Automatically maintained by [LearnTrack](https://github.com). Daily entries live in \`daily/\`.

## Goal

${input.goalTitle}

- **Start date:** ${input.startDate}
- **Target date:** ${input.targetDate}
- **Overall progress:** ${input.overallProgressPercent}%
- **Current streak:** ${input.currentStreak} days
- **Longest streak:** ${input.longestStreak} days
- **Total learning days:** ${input.totalLearningDays}

## Milestones

${milestoneLines || "_No milestones yet._"}

## How this repository is updated

Every entry here corresponds to real, completed learning activity recorded
in LearnTrack — never automated or placeholder commits. See \`progress.json\`
for machine-readable stats and \`daily/\` for day-by-day notes.

_Last updated: ${input.updatedAt}_
`;
}
