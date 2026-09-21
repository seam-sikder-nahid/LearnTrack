/**
 * Daily journal Markdown generation (§10).
 *
 * Hard rule: this function NEVER invents learning content. Every sentence
 * in "What I Learned" / "Practice" / "Resources" comes verbatim from user
 * input (task titles the user actually completed, and the free-text they
 * wrote). The only synthesized parts are structural: headings, the task
 * list, and the completion ratio, all derived from data, not generated
 * prose.
 */

export interface CompletedTaskForJournal {
  title: string;
  category: string | null;
  whatLearned: string;
  notes: string | null;
  resources: string[];
}

export interface JournalInput {
  date: string; // "YYYY-MM-DD"
  goalTitle: string;
  completedTasks: CompletedTaskForJournal[];
  tasksPlannedCount: number;
}

export function generateJournalMarkdown(input: JournalInput): string {
  const { date, goalTitle, completedTasks, tasksPlannedCount } = input;

  const completedList =
    completedTasks.length > 0
      ? completedTasks.map((t) => `* ${t.title}`).join("\n")
      : "_No tasks completed yet today._";

  const whatLearnedSection =
    completedTasks.length > 0
      ? completedTasks
          .map((t) => `**${t.title}**\n\n${t.whatLearned.trim()}`)
          .join("\n\n")
      : "_Nothing recorded yet._";

  const resources = completedTasks.flatMap((t) => t.resources);
  const resourcesSection =
    resources.length > 0
      ? resources.map((r) => `* ${r}`).join("\n")
      : "_None recorded._";

  const notes = completedTasks
    .map((t) => t.notes?.trim())
    .filter((n): n is string => Boolean(n && n.length > 0));
  const notesSection =
    notes.length > 0 ? notes.map((n) => `* ${n}`).join("\n") : null;

  const ratio = `${completedTasks.length} / ${tasksPlannedCount} tasks completed`;

  const sections = [
    `# Learning Log — ${date}`,
    `## Goal\n\n${goalTitle}`,
    `## Completed Tasks\n\n${completedList}`,
    `## What I Learned\n\n${whatLearnedSection}`,
    `## Resources\n\n${resourcesSection}`,
  ];

  if (notesSection) {
    sections.push(`## Notes\n\n${notesSection}`);
  }

  sections.push(`## Progress\n\n${ratio}`);

  return sections.join("\n\n") + "\n";
}

/** Derives the topic tags shown on journal cards (§20) purely from task categories. */
export function deriveTopics(completedTasks: CompletedTaskForJournal[]): string[] {
  const seen = new Set<string>();
  for (const t of completedTasks) {
    if (t.category) seen.add(t.category);
  }
  return Array.from(seen);
}
