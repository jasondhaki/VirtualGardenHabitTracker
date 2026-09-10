import { addDaysToLocalDate, compareLocalDates, localSeason } from "@/lib/dates";
import { isScheduledOn } from "@/lib/habits/schedule";

/**
 * Achievement evaluation (build plan §6.2, §6.3). Pure functions over
 * already-derived history — no DB access — so the same evaluator runs
 * identically from the lazy backfill, the completion transaction, and a
 * full rollup recompute (CLAUDE.md: "Achievement re-evaluation after
 * recompute is idempotent"). Callers persist only the keys this returns
 * that aren't already in `AchievementUnlock`; earned rows are write-once,
 * exactly like `Tile` (CLAUDE.md invariant #1) — an achievement is never
 * un-earned by later history.
 */

export interface AchievementRollupInput {
  localDate: string;
  scheduled: number;
  ratio: number;
  streakLength: number;
}

export interface AchievementCompletionInput {
  habitId: string;
  localDate: string;
  /** Hour of day (0-23) `Completion.createdAt` resolves to in the user's timezone. */
  localHour: number;
}

export interface AchievementHabitInput {
  id: string;
  scheduleMask: number;
  createdLocalDate: string;
  archivedLocalDate: string | null;
}

export interface EarnedAchievement {
  achievementKey: string;
  earnedOnDate: string;
}

function evaluateFirstSprout(completions: AchievementCompletionInput[]): EarnedAchievement | null {
  if (completions.length === 0) return null;
  let earliest = completions[0].localDate;
  for (const completion of completions) {
    if (compareLocalDates(completion.localDate, earliest) < 0) earliest = completion.localDate;
  }
  return { achievementKey: "first_sprout", earnedOnDate: earliest };
}

/** `rollups` must be sorted ascending by `localDate`. */
function evaluatePerfectWeek(rollups: AchievementRollupInput[]): EarnedAchievement | null {
  let streak = 0;
  for (const row of rollups) {
    if (row.scheduled === 0) continue; // schedule-aware, same as stepStreak (CLAUDE.md invariant #4)
    if (row.ratio >= 1) {
      streak++;
      if (streak === 7) return { achievementKey: "perfect_week", earnedOnDate: row.localDate };
    } else {
      streak = 0;
    }
  }
  return null;
}

function evaluateStreakThreshold(
  rollups: AchievementRollupInput[],
  achievementKey: string,
  threshold: number
): EarnedAchievement | null {
  for (const row of rollups) {
    if (row.streakLength >= threshold) return { achievementKey, earnedOnDate: row.localDate };
  }
  return null;
}

const COMEBACK_GAP_DAYS = 7;
const COMEBACK_STREAK_DAYS = 7;

/**
 * A "gap" is 7+ consecutive *scheduled* days missed (ratio < 0.6) — a
 * graced day still counts as missed here even though it protects the
 * streak number, because the achievement is about a real return to form,
 * not about the streak counter surviving. Once any qualifying gap has
 * occurred, the next time the streak reaches exactly 7 again earns it —
 * it doesn't have to be the very next attempt.
 */
function evaluateComeback(rollups: AchievementRollupInput[]): EarnedAchievement | null {
  let gapLength = 0;
  let hadQualifyingGap = false;

  for (const row of rollups) {
    if (row.scheduled === 0) continue;

    if (row.ratio >= 0.6) {
      gapLength = 0;
      if (hadQualifyingGap && row.streakLength === COMEBACK_STREAK_DAYS) {
        return { achievementKey: "comeback", earnedOnDate: row.localDate };
      }
    } else {
      gapLength++;
      if (gapLength >= COMEBACK_GAP_DAYS) hadQualifyingGap = true;
    }
  }
  return null;
}

const EARLY_RISER_HOUR_CUTOFF = 8;
const EARLY_RISER_COUNT = 20;

function evaluateEarlyRiser(completions: AchievementCompletionInput[]): EarnedAchievement | null {
  const earlyOnes = completions
    .filter((completion) => completion.localHour < EARLY_RISER_HOUR_CUTOFF)
    .slice()
    .sort((a, b) => compareLocalDates(a.localDate, b.localDate));

  if (earlyOnes.length < EARLY_RISER_COUNT) return null;
  return { achievementKey: "early_riser", earnedOnDate: earlyOnes[EARLY_RISER_COUNT - 1].localDate };
}

function evaluateFourSeasons(completions: AchievementCompletionInput[]): EarnedAchievement | null {
  const sorted = completions.slice().sort((a, b) => compareLocalDates(a.localDate, b.localDate));
  const seen = new Set<string>();
  for (const completion of sorted) {
    seen.add(localSeason(completion.localDate));
    if (seen.size === 4) return { achievementKey: "four_seasons", earnedOnDate: completion.localDate };
  }
  return null;
}

const POLYCULTURE_MIN_ACTIVE_HABITS = 5;
const POLYCULTURE_WINDOW_DAYS = 30;
const POLYCULTURE_RATIO_THRESHOLD = 0.8;

function isHabitActiveOn(habit: AchievementHabitInput, localDate: string): boolean {
  if (compareLocalDates(habit.createdLocalDate, localDate) > 0) return false;
  if (habit.archivedLocalDate && compareLocalDates(localDate, habit.archivedLocalDate) >= 0) return false;
  return true;
}

/**
 * "5+ active habits, all ≥80% over 30 days" — checked as of every rollup
 * date, using each habit's own trailing-30-calendar-day scheduled/completed
 * ratio. This is the one achievement that needs per-habit data `DayRollup`
 * doesn't carry (its `ratio` is already an aggregate across habits), so it
 * reads `completions` directly rather than only rollups.
 */
function evaluatePolyculture(
  rollups: AchievementRollupInput[],
  habits: AchievementHabitInput[],
  completions: AchievementCompletionInput[]
): EarnedAchievement | null {
  if (habits.length < POLYCULTURE_MIN_ACTIVE_HABITS) return null;

  const completionDatesByHabit = new Map<string, Set<string>>();
  for (const completion of completions) {
    const dates = completionDatesByHabit.get(completion.habitId) ?? new Set<string>();
    dates.add(completion.localDate);
    completionDatesByHabit.set(completion.habitId, dates);
  }

  for (const row of rollups) {
    const windowStart = addDaysToLocalDate(row.localDate, -(POLYCULTURE_WINDOW_DAYS - 1));

    // A habit must predate the window, not just be active on `row.localDate`
    // — otherwise a habit created yesterday trivially reads as "≥80%" off
    // one or two lucky days instead of a real 30-day track record.
    const activeHabits = habits.filter(
      (habit) => isHabitActiveOn(habit, row.localDate) && compareLocalDates(habit.createdLocalDate, windowStart) <= 0
    );
    if (activeHabits.length < POLYCULTURE_MIN_ACTIVE_HABITS) continue;

    const allQualify = activeHabits.every((habit) => {
      const habitCompletionDates = completionDatesByHabit.get(habit.id);
      let scheduledDays = 0;
      let completedDays = 0;

      for (let cursor = windowStart; compareLocalDates(cursor, row.localDate) <= 0; cursor = addDaysToLocalDate(cursor, 1)) {
        if (!isHabitActiveOn(habit, cursor) || !isScheduledOn(habit.scheduleMask, cursor)) continue;
        scheduledDays++;
        if (habitCompletionDates?.has(cursor)) completedDays++;
      }

      return scheduledDays > 0 && completedDays / scheduledDays >= POLYCULTURE_RATIO_THRESHOLD;
    });

    if (allQualify) return { achievementKey: "polyculture", earnedOnDate: row.localDate };
  }
  return null;
}

/**
 * Evaluate every achievement in `ACHIEVEMENT_CATALOG` against a user's full
 * history and return every one currently earned (not just newly-earned
 * ones) — callers diff against persisted `AchievementUnlock` rows and
 * insert only what's missing.
 */
export function evaluateAchievements(input: {
  /** Ascending by `localDate`. */
  rollups: AchievementRollupInput[];
  completions: AchievementCompletionInput[];
  habits: AchievementHabitInput[];
}): EarnedAchievement[] {
  const { rollups, completions, habits } = input;

  const results = [
    evaluateFirstSprout(completions),
    evaluatePerfectWeek(rollups),
    evaluateStreakThreshold(rollups, "fortnight", 14),
    evaluateComeback(rollups),
    evaluateEarlyRiser(completions),
    evaluateStreakThreshold(rollups, "steadfast", 30),
    evaluatePolyculture(rollups, habits, completions),
    evaluateFourSeasons(completions),
  ];

  return results.filter((result): result is EarnedAchievement => result !== null);
}
