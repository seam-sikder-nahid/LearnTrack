/**
 * Commit message formatting (§12, §24 "Commit format" setting).
 *
 * Format string supports {goal} and {date} placeholders, e.g the default
 * "Learning: {goal} — {date}" -> "Learning: Android Pentesting — 2026-09-18".
 */
export function formatCommitMessage(params: {
  format: string;
  goalTitle: string;
  date: string;
}): string {
  return params.format
    .replace("{goal}", params.goalTitle)
    .replace("{date}", params.date);
}
