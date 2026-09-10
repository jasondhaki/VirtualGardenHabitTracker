/**
 * Daily point scoring (see docs build plan §3.1). `ratio` is the only float
 * that survives into this math — everything returned here is rounded to an
 * integer before it's allowed near a points column (CLAUDE.md: "Points are
 * integers. Never floats.").
 */

const RATIO_EXPONENT = 0.7;
const STREAK_MULTIPLIER_STEP = 0.033;
const STREAK_MULTIPLIER_CAP_DAYS = 30;

export function basePointsFromRatio(ratio: number): number {
  return Math.round(10 * Math.pow(ratio, RATIO_EXPONENT));
}

export function streakMultiplier(streakLength: number): number {
  return 1 + Math.min(streakLength, STREAK_MULTIPLIER_CAP_DAYS) * STREAK_MULTIPLIER_STEP;
}

export function dailyPoints(ratio: number, streakLength: number): number {
  return Math.round(basePointsFromRatio(ratio) * streakMultiplier(streakLength));
}
