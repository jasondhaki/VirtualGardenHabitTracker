import { addDaysToLocalDate, todayLocalDate } from "@/lib/dates";
import { computeRollupRange } from "./compute";
import { loadCompletionsForRollup, loadHabitsForRollup, loadStreakStateAsOf, type RollupDbClient } from "./loaders";
import { upsertRollupRows } from "./upsert";

/**
 * Recompute and upsert *today's* `DayRollup` row. Called from inside the
 * same transaction as the completion write in lib/actions/completions.ts
 * (CLAUDE.md build plan §11 P3: "Rollup write path inside the completion
 * transaction") — a check-off and its effect on the garden must never be
 * observably out of sync.
 *
 * Assumes `ensureRollupsCurrent` has already backfilled through yesterday;
 * it only ever touches today's row.
 */
export async function upsertTodayRollup(tx: RollupDbClient, userId: string, timezone: string): Promise<void> {
  const today = todayLocalDate(timezone);
  const yesterday = addDaysToLocalDate(today, -1);

  const [habits, completions, startState] = await Promise.all([
    loadHabitsForRollup(tx, userId, timezone),
    loadCompletionsForRollup(tx, userId, today, today),
    loadStreakStateAsOf(tx, userId, yesterday),
  ]);

  const [row] = computeRollupRange(today, today, habits, completions, startState);
  await upsertRollupRows(tx, userId, [row]);
}
