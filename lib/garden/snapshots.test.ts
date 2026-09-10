import { describe, expect, it } from "vitest";
import { addDaysToLocalDate } from "@/lib/dates";
import { computeGardenPlacement, type AchievementCheckpoint } from "./placement";
import { buildPlotRenderModel, type RenderedSpecies } from "./render-data";
import type { SpeciesCatalogEntry } from "./species-pool";
import { buildDailySnapshots, type SnapshotRollupRow } from "./snapshots";

const catalog: SpeciesCatalogEntry[] = [
  { id: "common-1", rarity: "COMMON", unlockKind: "POINTS", unlockAtPoints: 0, achievementKey: null },
  { id: "common-2", rarity: "COMMON", unlockKind: "POINTS", unlockAtPoints: 40, achievementKey: null },
  { id: "rare-1", rarity: "RARE", unlockKind: "ACHIEVEMENT", unlockAtPoints: null, achievementKey: "perfect_week" },
];

const speciesById = new Map<string, RenderedSpecies>(
  catalog.map((species) => [species.id, { name: species.id, rarity: species.rarity, spriteKey: species.id }])
);

const achievements: AchievementCheckpoint[] = [{ achievementKey: "perfect_week", earnedOnDate: "2026-01-20" }];

function buildRollups(days: number, pointsPerDay: number, startDate = "2026-01-01"): SnapshotRollupRow[] {
  const rows: SnapshotRollupRow[] = [];
  let date = startDate;
  for (let i = 0; i < days; i++) {
    rows.push({ localDate: date, pointsEarned: pointsPerDay, scheduled: 1, ratio: 1 });
    date = addDaysToLocalDate(date, 1);
  }
  return rows;
}

describe("buildDailySnapshots", () => {
  it("returns nothing for empty history", () => {
    expect(buildDailySnapshots({ gardenSeed: 1, rollups: [], achievementUnlocks: [], species: catalog, speciesById })).toEqual([]);
  });

  it("produces one entry per day, with non-decreasing cumulative points", () => {
    const rollups = buildRollups(30, 15);
    const snapshots = buildDailySnapshots({ gardenSeed: 1, rollups, achievementUnlocks: achievements, species: catalog, speciesById });

    expect(snapshots).toHaveLength(30);
    for (let i = 1; i < snapshots.length; i++) {
      expect(snapshots[i].totalPoints).toBeGreaterThanOrEqual(snapshots[i - 1].totalPoints);
    }
  });

  it("the last snapshot matches a direct computeGardenPlacement call over full history", () => {
    const rollups = buildRollups(60, 15);
    const snapshots = buildDailySnapshots({ gardenSeed: 7, rollups, achievementUnlocks: achievements, species: catalog, speciesById });
    const last = snapshots[snapshots.length - 1];

    const fullTimeline = rollups.reduce<{ localDate: string; cumulativePoints: number }[]>((acc, row) => {
      const cumulative = (acc[acc.length - 1]?.cumulativePoints ?? 0) + row.pointsEarned;
      acc.push({ localDate: row.localDate, cumulativePoints: cumulative });
      return acc;
    }, []);
    const directTiles = computeGardenPlacement({ gardenSeed: 7, pointsTimeline: fullTimeline, species: catalog, achievementUnlocks: achievements });
    const directModel = buildPlotRenderModel(7, 1, directTiles, speciesById);

    expect(last.plots[0]).toEqual(directModel);
  });

  it("windowDays only shortens the array, never changes tile content at the boundary", () => {
    const rollups = buildRollups(60, 15);
    const full = buildDailySnapshots({ gardenSeed: 3, rollups, achievementUnlocks: achievements, species: catalog, speciesById });
    const windowed = buildDailySnapshots({ gardenSeed: 3, rollups, achievementUnlocks: achievements, species: catalog, speciesById, windowDays: 10 });

    expect(windowed).toHaveLength(10);
    expect(windowed).toEqual(full.slice(-10));
  });
});
