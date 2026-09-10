import { db } from "@/lib/db";
import { formatDbDate } from "@/lib/dates";
import { ensureRollupsCurrent } from "@/lib/rollup/ensure-current";
import { computeGardenPlacement, type PlacedTile } from "./placement";
import type { SpeciesCatalogEntry } from "./species-pool";
import { buildPointsTimeline } from "./timeline";

function tileKey(tile: Pick<PlacedTile, "plotIndex" | "x" | "y">): string {
  return `${tile.plotIndex}:${tile.x}:${tile.y}`;
}

/**
 * Lazily materialize every newly-unlocked `Tile` for a user (build plan
 * §5.3 — write-once assignment; no scheduler on Vercel Hobby, so this runs
 * on garden reads the same way `ensureRollupsCurrent` backfills rollups).
 *
 * Recomputes the full placement from scratch every call — cheap relative to
 * the DB round trips — and only ever *inserts* the rows the diff is missing.
 * An already-unlocked tile's position and species never change (CLAUDE.md
 * invariant #1): if you find yourself writing an `UPDATE` against `Tile`
 * here, that's the bug.
 */
export async function ensureGardenCurrent(userId: string): Promise<void> {
  await ensureRollupsCurrent(userId);

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { gardenSeed: true, currentPlotCount: true },
  });
  if (!user) return;

  const rollups = await db.dayRollup.findMany({
    where: { userId },
    orderBy: { localDate: "asc" },
    select: { localDate: true, pointsEarned: true },
  });
  if (rollups.length === 0) return;

  const pointsTimeline = buildPointsTimeline(
    rollups.map((row) => ({ localDate: formatDbDate(row.localDate), pointsEarned: row.pointsEarned }))
  );

  const [achievementRows, speciesRows, existingTiles] = await Promise.all([
    db.achievementUnlock.findMany({ where: { userId }, select: { achievementKey: true, earnedOnDate: true } }),
    db.species.findMany({ select: { id: true, rarity: true, unlockKind: true, unlockAtPoints: true, achievementKey: true } }),
    db.tile.findMany({ where: { userId }, select: { plotIndex: true, x: true, y: true } }),
  ]);

  const species: SpeciesCatalogEntry[] = speciesRows;
  const achievementUnlocks = achievementRows.map((row) => ({
    achievementKey: row.achievementKey,
    earnedOnDate: formatDbDate(row.earnedOnDate),
  }));

  const placement = computeGardenPlacement({ gardenSeed: user.gardenSeed, pointsTimeline, species, achievementUnlocks });

  const existingKeys = new Set(existingTiles.map(tileKey));
  const newTiles = placement.filter((tile) => !existingKeys.has(tileKey(tile)));

  if (newTiles.length > 0) {
    await db.tile.createMany({
      data: newTiles.map((tile) => ({
        userId,
        plotIndex: tile.plotIndex,
        x: tile.x,
        y: tile.y,
        placementOrder: tile.placementOrder,
        isFeatureSlot: tile.isFeatureSlot,
        speciesId: tile.speciesId,
        unlockedAtPoints: tile.unlockedAtPoints,
      })),
    });
  }

  const plotCount = placement.reduce((max, tile) => Math.max(max, tile.plotIndex), 1);
  if (plotCount > user.currentPlotCount) {
    await db.user.update({ where: { id: userId }, data: { currentPlotCount: plotCount } });
  }
}
