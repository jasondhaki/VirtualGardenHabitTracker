/**
 * Schedule-aware streak stepping (CLAUDE.md invariant #4). A streak only
 * ever advances or breaks on a day something was actually scheduled — a day
 * with nothing due (a Tuesday for a Mon/Wed/Fri habit) must carry the streak
 * forward untouched, not break it.
 *
 * Grace days protect the streak from a single bad day without pretending it
 * didn't happen: a graced day keeps the streak alive but doesn't extend it,
 * so the count picks back up from where it was on the next real success.
 * Two grace days are granted per calendar month, consumed silently.
 */

export const STREAK_RATIO_THRESHOLD = 0.6;
export const GRACE_DAYS_PER_MONTH = 2;

export interface StreakState {
  streakLength: number;
  gracesUsedThisMonth: number;
  monthKey: string; // "" until the first day is stepped
}

export function initialStreakState(): StreakState {
  return { streakLength: 0, gracesUsedThisMonth: 0, monthKey: "" };
}

export interface StreakStep {
  streakLength: number;
  gracedDay: boolean;
  nextState: StreakState;
}

/**
 * Advance the streak by one day. `localDate` must be a `yyyy-MM-dd` string
 * already resolved in the user's timezone (see lib/dates).
 */
export function stepStreak(state: StreakState, localDate: string, scheduled: number, ratio: number): StreakStep {
  const monthKey = localDate.slice(0, 7);
  const gracesUsedThisMonth = monthKey === state.monthKey ? state.gracesUsedThisMonth : 0;

  if (scheduled === 0) {
    return {
      streakLength: state.streakLength,
      gracedDay: false,
      nextState: { streakLength: state.streakLength, gracesUsedThisMonth, monthKey },
    };
  }

  if (ratio >= STREAK_RATIO_THRESHOLD) {
    const streakLength = state.streakLength + 1;
    return {
      streakLength,
      gracedDay: false,
      nextState: { streakLength, gracesUsedThisMonth, monthKey },
    };
  }

  if (gracesUsedThisMonth < GRACE_DAYS_PER_MONTH) {
    return {
      streakLength: state.streakLength,
      gracedDay: true,
      nextState: {
        streakLength: state.streakLength,
        gracesUsedThisMonth: gracesUsedThisMonth + 1,
        monthKey,
      },
    };
  }

  return {
    streakLength: 0,
    gracedDay: false,
    nextState: { streakLength: 0, gracesUsedThisMonth, monthKey },
  };
}
