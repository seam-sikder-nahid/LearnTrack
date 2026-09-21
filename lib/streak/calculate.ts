/**
 * Streak calculation (§18).
 *
 * IMPORTANT PRODUCT RULE: the Learning Streak is computed purely from
 * `dailyProgress.countsForStreak`, which is set when the user completes at
 * least one planned task or records learning activity for that date. It
 * must NEVER depend on GitHub sync status — GitHub is a side effect (§2),
 * not a precondition. `streakRequiresGithub` exists in UserSettings only as
 * an explicit opt-in for users who want to couple the two; the default is
 * false and this module ignores GitHub entirely unless the caller passes a
 * day that has already been filtered/annotated by that setting upstream.
 */

export interface StreakDay {
  /** "YYYY-MM-DD" */
  date: string;
  countsForStreak: boolean;
}

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  totalLearningDays: number;
}

/**
 * `days` must be sorted ascending by date and should be a dense range
 * (every calendar day between the goal's start date and today), with
 * `countsForStreak: false` for days that have no DailyProgress row, so gaps
 * are represented explicitly rather than skipped.
 */
export function calculateStreak(days: StreakDay[]): StreakResult {
  let longestStreak = 0;
  let running = 0;
  let totalLearningDays = 0;

  for (const day of days) {
    if (day.countsForStreak) {
      running += 1;
      totalLearningDays += 1;
      longestStreak = Math.max(longestStreak, running);
    } else {
      running = 0;
    }
  }

  // Current streak = the run ending at the *last* day in the list that
  // counts, walking backward until it breaks. If the most recent day in
  // the range doesn't count (e.g. "today" with nothing logged yet), the
  // current streak is whatever run was still active as of yesterday — i.e.
  // we don't zero out a streak just because today hasn't happened yet.
  let currentStreak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].countsForStreak) {
      currentStreak += 1;
    } else if (currentStreak > 0) {
      break;
    } else if (i === days.length - 1) {
      // Today (or the last day) is empty — keep looking backward without
      // counting it, so an in-progress streak from yesterday still shows.
      continue;
    } else {
      break;
    }
  }

  return { currentStreak, longestStreak, totalLearningDays };
}
