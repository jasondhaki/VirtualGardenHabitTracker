import type { PointsCheckpoint } from "./placement";

export interface RollupPointsRow {
  localDate: string;
  pointsEarned: number;
}

/**
 * Turn per-day `DayRollup.pointsEarned` rows into the cumulative timeline
 * the placement engine consumes (build plan §5.1 — tile unlocks are
 * cumulative and permanent, unlike the trailing-window wilt calculation).
 * `rows` must already be sorted ascending by `localDate`.
 */
export function buildPointsTimeline(rows: RollupPointsRow[]): PointsCheckpoint[] {
  let cumulative = 0;
  return rows.map((row) => {
    cumulative += row.pointsEarned;
    return { localDate: row.localDate, cumulativePoints: cumulative };
  });
}
