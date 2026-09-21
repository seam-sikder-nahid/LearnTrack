/**
 * Single source of truth for turning a Date into the "YYYY-MM-DD" key used
 * throughout the app (journal filenames, streak days, sync grouping).
 * Uses UTC deliberately so a user's local midnight doesn't shift which
 * "day" a task belongs to depending on server timezone.
 */
export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function dateKeyRange(startKey: string, endKey: string): string[] {
  const start = new Date(startKey + "T00:00:00Z");
  const end = new Date(endKey + "T00:00:00Z");
  const out: string[] = [];
  for (let d = start; d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(toDateKey(d));
  }
  return out;
}
