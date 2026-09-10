import { mulberry32 } from "@/lib/prng";
import { deriveSeed } from "./seed";
import { spiralOrder } from "./spiral";
import { plotStartingPoints, tileUnlockPoints } from "./unlock-thresholds";
import { eligibleSpecies, pickSpecies, type SpeciesCatalogEntry } from "./species-pool";

export interface PointsCheckpoint {
  localDate: string;
  /** Cumulative points as of this date — must be non-decreasing across the array. */
  cumulativePoints: number;
}

export interface AchievementCheckpoint {
  achievementKey: string;
  earnedOnDate: string;
}

export interface PlacementInput {
  gardenSeed: number;
  /** Chronological, one entry per day with a rollup. */
  pointsTimeline: PointsCheckpoint[];
  species: SpeciesCatalogEntry[];
  achievementUnlocks: AchievementCheckpoint[];
}

export interface PlacedTile {
  plotIndex: number;
  x: number;
  y: number;
  placementOrder: number;
  isFeatureSlot: boolean;
  speciesId: string;
  unlockedAtPoints: number;
}

const SPECIES_STREAM_SALT = 0xf00d;

function buildCumulativeAchievements(
  points: PointsCheckpoint[],
  achievementUnlocks: AchievementCheckpoint[]
): ReadonlySet<string>[] {
  const earnedByDate = new Map<string, string[]>();
  for (const unlock of achievementUnlocks) {
    const keys = earnedByDate.get(unlock.earnedOnDate) ?? [];
    keys.push(unlock.achievementKey);
    earnedByDate.set(unlock.earnedOnDate, keys);
  }

  const result: Set<string>[] = [];
  const running = new Set<string>();
  for (const point of points) {
    for (const key of earnedByDate.get(point.localDate) ?? []) running.add(key);
    result.push(new Set(running));
  }
  return result;
}

function firstIndexAtLeast(points: PointsCheckpoint[], threshold: number, fromIndex: number): number {
  for (let i = fromIndex; i < points.length; i++) {
    if (points[i].cumulativePoints >= threshold) return i;
  }
  return -1;
}

function firstIndexWithEligibleSpecies(
  points: PointsCheckpoint[],
  cumulativeAchievements: ReadonlySet<string>[],
  catalog: SpeciesCatalogEntry[],
  isFeatureSlot: boolean,
  fromIndex: number
): number {
  for (let i = fromIndex; i < points.length; i++) {
    if (eligibleSpecies(catalog, isFeatureSlot, points[i].cumulativePoints, cumulativeAchievements[i]).length > 0) return i;
  }
  return -1;
}

function estimatePlotCount(finalPoints: number): number {
  let plotIndex = 1;
  while (plotStartingPoints(plotIndex + 1) <= finalPoints) plotIndex++;
  return plotIndex;
}

/**
 * Compute every tile that has unlocked so far, from raw history — no
 * database access. A tile appears once its points threshold is crossed
 * *and*, for feature slots, once a RARE/LEGENDARY species is actually
 * available to assign; until then that slot simply stays open rather than
 * blocking tiles after it (build plan §5.2 — "claims the next open feature
 * slot" implies waiting, not stalling).
 *
 * Deterministic: same `gardenSeed` + same `pointsTimeline`/`achievementUnlocks`
 * always produces the same list, and a longer history only ever appends —
 * every tile present for a shorter history is present unchanged for a
 * longer one built from the same seed and a superset of that history. That
 * "write-once" property is what CLAUDE.md invariant #1 depends on.
 */
export function computeGardenPlacement(input: PlacementInput): PlacedTile[] {
  const { gardenSeed, pointsTimeline, species, achievementUnlocks } = input;
  if (pointsTimeline.length === 0) return [];

  const finalPoints = pointsTimeline[pointsTimeline.length - 1].cumulativePoints;
  const plotCount = estimatePlotCount(finalPoints);
  const cumulativeAchievements = buildCumulativeAchievements(pointsTimeline, achievementUnlocks);

  const speciesRand = mulberry32(deriveSeed(gardenSeed, SPECIES_STREAM_SALT));
  const recentFeatureSpeciesIds: string[] = [];
  const recentCommonSpeciesIds: string[] = [];

  const tiles: PlacedTile[] = [];

  for (let plotIndex = 1; plotIndex <= plotCount; plotIndex++) {
    const order = spiralOrder(deriveSeed(gardenSeed, plotIndex));

    for (const cell of order) {
      const threshold = tileUnlockPoints(plotIndex, cell.placementOrder);

      const pointsIdx = firstIndexAtLeast(pointsTimeline, threshold, 0);
      if (pointsIdx === -1) continue;

      const speciesIdx = firstIndexWithEligibleSpecies(pointsTimeline, cumulativeAchievements, species, cell.isFeatureSlot, pointsIdx);
      if (speciesIdx === -1) continue;

      const pool = eligibleSpecies(
        species,
        cell.isFeatureSlot,
        pointsTimeline[speciesIdx].cumulativePoints,
        cumulativeAchievements[speciesIdx]
      );
      const recent = cell.isFeatureSlot ? recentFeatureSpeciesIds : recentCommonSpeciesIds;
      const picked = pickSpecies(pool, recent, speciesRand);
      if (!picked) continue;

      recent.push(picked.id);

      tiles.push({
        plotIndex,
        x: cell.x,
        y: cell.y,
        placementOrder: cell.placementOrder,
        isFeatureSlot: cell.isFeatureSlot,
        speciesId: picked.id,
        unlockedAtPoints: threshold,
      });
    }
  }

  return tiles;
}
