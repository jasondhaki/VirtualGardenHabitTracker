/**
 * Wilt/growth-stage derivation (build plan §3.2, §3.4). The whole garden
 * shares one tier, derived from the trailing 14-*scheduled*-day average of
 * `DayRollup.ratio` — the same aggregate the points and streak math already
 * use, never a new stored field (CLAUDE.md invariant #1).
 *
 * Schedule-aware the same way `stepStreak` is (CLAUDE.md invariant #4): a
 * day with nothing scheduled is skipped rather than counted as a 0, so a
 * Mon/Wed/Fri-only user's garden doesn't wilt over empty Tuesdays.
 */

export type WiltTier = "thriving" | "healthy" | "drooping" | "dormant";

const WILT_TIERS: ReadonlyArray<{ tier: WiltTier; minRatio: number }> = [
  { tier: "thriving", minRatio: 0.8 },
  { tier: "healthy", minRatio: 0.5 },
  { tier: "drooping", minRatio: 0.25 },
  { tier: "dormant", minRatio: 0 },
];

const WILT_WINDOW_DAYS = 14;

export function wiltTierFromAverageRatio(averageRatio: number): WiltTier {
  for (const { tier, minRatio } of WILT_TIERS) {
    if (averageRatio >= minRatio) return tier;
  }
  return "dormant";
}

export interface WiltRollupInput {
  scheduled: number;
  ratio: number;
}

/**
 * Average `ratio` over the most recent 14 *scheduled* days in `rowsDescending`
 * (most-recent-first, as many rows as available — callers just need to pass
 * enough to cover 14 scheduled days). A user with no scheduled history yet
 * gets the benefit of the doubt (1.0 — nothing to judge poorly) rather than
 * reading as dormant before they've had a chance to do anything.
 */
export function trailingWiltAverage(rowsDescending: WiltRollupInput[]): number {
  let sum = 0;
  let count = 0;
  for (const row of rowsDescending) {
    if (row.scheduled === 0) continue;
    sum += row.ratio;
    count++;
    if (count === WILT_WINDOW_DAYS) break;
  }
  return count === 0 ? 1 : sum / count;
}

export function currentWiltTier(rowsDescending: WiltRollupInput[]): WiltTier {
  return wiltTierFromAverageRatio(trailingWiltAverage(rowsDescending));
}
