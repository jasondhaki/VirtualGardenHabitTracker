import { formatInTimeZone } from "date-fns-tz";

/**
 * The only correct way to get "today" for a user. Never derive the current
 * date on the client, and never use `new Date().toISOString().split('T')[0]`.
 */
export function todayLocalDate(timezone: string, now: Date = new Date()): string {
  return formatInTimeZone(now, timezone, "yyyy-MM-dd");
}

/**
 * Prisma hydrates a `@db.Date` column as a JS Date at UTC midnight for that
 * calendar date. Format it back to `yyyy-MM-dd` without going through the
 * viewer's timezone, or DST/offset differences can shift the date by a day.
 */
export function formatDbDate(date: Date): string {
  return formatInTimeZone(date, "UTC", "yyyy-MM-dd");
}

/**
 * Build the UTC-midnight Date Prisma expects when writing a `@db.Date`
 * column from a `yyyy-MM-dd` string already resolved in the user's timezone.
 */
export function toDbDate(localDate: string): Date {
  return new Date(`${localDate}T00:00:00.000Z`);
}

export function addDaysToLocalDate(localDate: string, days: number): string {
  const date = toDbDate(localDate);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDbDate(date);
}

export function compareLocalDates(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export type Season = "winter" | "spring" | "summer" | "fall";

/**
 * Meteorological (Northern-hemisphere) season for a `yyyy-MM-dd` local date
 * string — the app never collects a user's location, so this is a
 * deliberate simplification, not a timezone bug. Read the month straight out
 * of the string rather than through a `Date`, so there's no UTC-offset
 * subtlety to get wrong (see `formatDbDate` above for why that matters here).
 */
export function localSeason(localDate: string): Season {
  const month = Number(localDate.slice(5, 7));
  if (month === 12 || month <= 2) return "winter";
  if (month <= 5) return "spring";
  if (month <= 8) return "summer";
  return "fall";
}
