import { addDaysToLocalDate, compareLocalDates } from "@/lib/dates";

/**
 * Decide what date range (if any) needs backfilling into `DayRollup`.
 * Pulled out as a pure function because the timezone edge cases here are
 * exactly the ones that bite in production and are cheap to get wrong:
 * a user changing timezone mid-streak can make "today" jump backward
 * relative to the last stored rollup, and this must never try to
 * backfill a negative range or re-touch an already-written day.
 */
export function computeBackfillRange(
  lastRollupLocalDate: string | null,
  todayLocalDate: string,
  earliestLocalDate: string | null
): { from: string; to: string } | null {
  const yesterday = addDaysToLocalDate(todayLocalDate, -1);

  if (lastRollupLocalDate && compareLocalDates(lastRollupLocalDate, yesterday) >= 0) {
    return null;
  }

  const from = lastRollupLocalDate ? addDaysToLocalDate(lastRollupLocalDate, 1) : earliestLocalDate;
  if (!from) return null;
  if (compareLocalDates(from, yesterday) > 0) return null;

  return { from, to: yesterday };
}
