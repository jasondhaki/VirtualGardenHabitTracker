import { compareLocalDates, localSeason, type Season } from "@/lib/dates";
import { currentWiltTier, type WiltRollupInput, type WiltTier } from "@/lib/growth/wilt";
import { buildPlotRenderModel, type PlotRenderModel, type RenderedSpecies } from "./render-data";
import { computeGardenPlacement, type AchievementCheckpoint } from "./placement";
import type { SpeciesCatalogEntry } from "./species-pool";
import { buildPointsTimeline } from "./timeline";

export interface SnapshotRollupRow extends WiltRollupInput {
  localDate: string;
  pointsEarned: number;
}

export interface DaySnapshot {
  localDate: string;
  totalPoints: number;
  wiltTier: WiltTier;
  season: Season;
  plots: PlotRenderModel[];
}

export interface BuildDailySnapshotsInput {
  gardenSeed: number;
  /** Full history, ascending by `localDate` — never pre-truncated, so tile identity and cumulative points stay correct. */
  rollups: SnapshotRollupRow[];
  /** Full history — may include unlocks earned after the snapshot window (they're filtered per-day below). */
  achievementUnlocks: AchievementCheckpoint[];
  species: SpeciesCatalogEntry[];
  speciesById: ReadonlyMap<string, RenderedSpecies>;
  /** How many trailing days actually get a snapshot entry. Omit for the full history (safe for a bounded demo). */
  windowDays?: number;
}

/**
 * One garden-as-it-was snapshot per day, built by re-running the same pure
 * placement/wilt pipeline `lib/garden/sync.ts` uses for "today," but against
 * a truncated history for each earlier day (`lib/garden/placement.ts`'s
 * docstring guarantees a longer history only ever *appends* tiles, which is
 * what makes this correct and cheap — no separate snapshot storage, ever;
 * CLAUDE.md invariant #1).
 *
 * `windowDays` only limits how many days get an entry in the returned array
 * — `pointsTimeline`/`achievementUnlocks` are always derived from the full
 * `rollups` you pass in, so a capped scrubber window on a long-lived account
 * never changes which tiles exist or what they're worth.
 */
export function buildDailySnapshots(input: BuildDailySnapshotsInput): DaySnapshot[] {
  const { gardenSeed, rollups, achievementUnlocks, species, speciesById, windowDays } = input;
  if (rollups.length === 0) return [];

  const pointsTimeline = buildPointsTimeline(rollups.map((row) => ({ localDate: row.localDate, pointsEarned: row.pointsEarned })));
  const startIndex = windowDays !== undefined ? Math.max(0, rollups.length - windowDays) : 0;

  const snapshots: DaySnapshot[] = [];

  for (let i = startIndex; i < rollups.length; i++) {
    const localDate = rollups[i].localDate;
    const truncatedPoints = pointsTimeline.slice(0, i + 1);
    const truncatedAchievements = achievementUnlocks.filter((unlock) => compareLocalDates(unlock.earnedOnDate, localDate) <= 0);

    const placement = computeGardenPlacement({
      gardenSeed,
      pointsTimeline: truncatedPoints,
      species,
      achievementUnlocks: truncatedAchievements,
    });

    const plotCount = placement.reduce((max, tile) => Math.max(max, tile.plotIndex), 1);
    const plots: PlotRenderModel[] = [];
    for (let plotIndex = 1; plotIndex <= plotCount; plotIndex++) {
      plots.push(buildPlotRenderModel(gardenSeed, plotIndex, placement, speciesById));
    }

    const wiltRowsDescending = rollups
      .slice(0, i + 1)
      .slice()
      .reverse();

    snapshots.push({
      localDate,
      totalPoints: truncatedPoints[truncatedPoints.length - 1].cumulativePoints,
      wiltTier: currentWiltTier(wiltRowsDescending),
      season: localSeason(localDate),
      plots,
    });
  }

  return snapshots;
}
