/**
 * `scheduleMask` is a 7-bit int, Mon=1 ... Sun=64 (see CLAUDE.md invariant #4).
 * A Mon/Wed/Fri habit must not break on Tuesday, which is why every streak
 * or "is this habit due today" query has to go through this bitmask rather
 * than counting consecutive calendar days.
 */
export const SCHEDULE_DAYS = [
  { key: "mon", label: "Mon", bit: 1 },
  { key: "tue", label: "Tue", bit: 2 },
  { key: "wed", label: "Wed", bit: 4 },
  { key: "thu", label: "Thu", bit: 8 },
  { key: "fri", label: "Fri", bit: 16 },
  { key: "sat", label: "Sat", bit: 32 },
  { key: "sun", label: "Sun", bit: 64 },
] as const;

export type ScheduleDayKey = (typeof SCHEDULE_DAYS)[number]["key"];

export const EVERY_DAY_MASK = SCHEDULE_DAYS.reduce((mask, day) => mask | day.bit, 0);

export function maskFromDayKeys(keys: readonly string[]): number {
  const bitByKey = new Map<string, number>(SCHEDULE_DAYS.map((day) => [day.key, day.bit]));
  return keys.reduce((mask, key) => mask | (bitByKey.get(key) ?? 0), 0);
}

export function dayKeysFromMask(mask: number): ScheduleDayKey[] {
  return SCHEDULE_DAYS.filter((day) => (mask & day.bit) !== 0).map((day) => day.key);
}

/**
 * `localDate` is a `yyyy-MM-dd` string already resolved in the user's
 * timezone (see lib/dates). Parsing it as UTC midnight is safe here because
 * we only ever read the calendar weekday back out, not a wall-clock time.
 */
export function scheduleBitForLocalDate(localDate: string): number {
  const jsDay = new Date(`${localDate}T00:00:00.000Z`).getUTCDay(); // 0=Sun..6=Sat
  const isoDay = jsDay === 0 ? 7 : jsDay; // 1=Mon..7=Sun
  return SCHEDULE_DAYS[isoDay - 1].bit;
}

export function isScheduledOn(scheduleMask: number, localDate: string): boolean {
  return (scheduleMask & scheduleBitForLocalDate(localDate)) !== 0;
}
