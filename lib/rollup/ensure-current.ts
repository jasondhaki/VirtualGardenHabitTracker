import { db } from "@/lib/db";
import { formatDbDate, todayLocalDate } from "@/lib/dates";
import { computeRollupRange } from "./compute";
import { earliestCreatedLocalDate, loadCompletionsForRollup, loadHabitsForRollup, loadStreakStateAsOf } from "./loaders";
import { computeBackfillRange } from "./range";
import { upsertRollupRows } from "./upsert";

/**
 * Lazily backfill `DayRollup` through yesterday for a user. There is no
 * scheduler on Vercel Hobby (CLAUDE.md invariant #6), so this runs on every
 * authenticated read that needs rollups, and is cheap to call repeatedly —
 * it no-ops the moment the user is already current.
 *
 * Today's own row is intentionally NOT written here: it's written inside
 * the completion transaction (see lib/rollup/today.ts) so a check-off and
 * its rollup effect land atomically.
 */
export async function ensureRollupsCurrent(userId: string): Promise<void> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { timezone: true } });
  if (!user) return;

  const today = todayLocalDate(user.timezone);

  const lastRollup = await db.dayRollup.findFirst({
    where: { userId },
    orderBy: { localDate: "desc" },
    select: { localDate: true },
  });
  const lastLocalDate = lastRollup ? formatDbDate(lastRollup.localDate) : null;

  const habits = await loadHabitsForRollup(db, userId, user.timezone);
  const range = computeBackfillRange(lastLocalDate, today, earliestCreatedLocalDate(habits));
  if (!range) return;

  const startState = lastLocalDate ? await loadStreakStateAsOf(db, userId, lastLocalDate) : undefined;
  const completions = await loadCompletionsForRollup(db, userId, range.from, range.to);
  const rows = computeRollupRange(range.from, range.to, habits, completions, startState);

  await upsertRollupRows(db, userId, rows);
}
