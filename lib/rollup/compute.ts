import { addDaysToLocalDate, compareLocalDates } from "@/lib/dates";
import { isScheduledOn } from "@/lib/habits/schedule";
import { dailyPoints } from "@/lib/growth/points";
import { initialStreakState, stepStreak, type StreakState } from "@/lib/growth/streaks";

/**
 * Everything this module needs about a habit to decide whether it was
 * "scheduled" on a given day, expressed as plain local-date strings so the
 * engine never has to reason about timezones itself — callers resolve
 * `createdAt`/`archivedAt` into the user's local calendar before handing
 * habits in here (see lib/rollup/loaders.ts).
 */
export interface RollupHabitInput {
  id: string;
  scheduleMask: number;
  targetPerDay: number;
  createdLocalDate: string;
  archivedLocalDate: string | null;
}

export interface RollupCompletionInput {
  habitId: string;
  localDate: string;
  count: number;
}

export interface DayRollupResult {
  localDate: string;
  scheduled: number;
  completed: number;
  ratio: number;
  pointsEarned: number;
  streakLength: number;
  gracedDay: boolean;
}

function isHabitActiveOn(habit: RollupHabitInput, localDate: string): boolean {
  if (compareLocalDates(habit.createdLocalDate, localDate) > 0) return false;
  if (habit.archivedLocalDate && compareLocalDates(localDate, habit.archivedLocalDate) >= 0) return false;
  return true;
}

/**
 * Compute one `DayRollup` row from raw habit/completion facts plus the
 * streak state carried in from the previous day. Pure — no DB access — so
 * it can be run identically from a full from-scratch recompute or an
 * incremental lazy backfill and produce the same row either way.
 */
export function computeDayRollup(
  localDate: string,
  habits: RollupHabitInput[],
  completions: RollupCompletionInput[],
  streakState: StreakState
): { row: DayRollupResult; nextState: StreakState } {
  const scheduledHabits = habits.filter((habit) => isHabitActiveOn(habit, localDate) && isScheduledOn(habit.scheduleMask, localDate));

  const completionsByHabitId = new Map(
    completions.filter((completion) => completion.localDate === localDate).map((completion) => [completion.habitId, completion.count])
  );

  const scheduled = scheduledHabits.length;
  const fractions = scheduledHabits.map((habit) => Math.min((completionsByHabitId.get(habit.id) ?? 0) / habit.targetPerDay, 1));
  const completed = fractions.filter((fraction) => fraction >= 1).length;
  const ratio = scheduled > 0 ? fractions.reduce((sum, fraction) => sum + fraction, 0) / scheduled : 0;

  const step = stepStreak(streakState, localDate, scheduled, ratio);

  return {
    row: {
      localDate,
      scheduled,
      completed,
      ratio,
      pointsEarned: dailyPoints(ratio, step.streakLength),
      streakLength: step.streakLength,
      gracedDay: step.gracedDay,
    },
    nextState: step.nextState,
  };
}

/**
 * Compute every `DayRollup` row from `fromLocalDate` through `toLocalDate`
 * inclusive, threading streak state day to day. This is the one function
 * both the lazy backfill and the full recompute job call — resuming from a
 * persisted `StreakState` (incremental) or `initialStreakState()` (full
 * recompute) must produce identical rows for the same range.
 */
export function computeRollupRange(
  fromLocalDate: string,
  toLocalDate: string,
  habits: RollupHabitInput[],
  completions: RollupCompletionInput[],
  startState: StreakState = initialStreakState()
): DayRollupResult[] {
  const rows: DayRollupResult[] = [];
  let state = startState;
  let localDate = fromLocalDate;

  while (compareLocalDates(localDate, toLocalDate) <= 0) {
    const { row, nextState } = computeDayRollup(localDate, habits, completions, state);
    rows.push(row);
    state = nextState;
    localDate = addDaysToLocalDate(localDate, 1);
  }

  return rows;
}
