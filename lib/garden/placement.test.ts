import { describe, expect, it } from "vitest";
import { addDaysToLocalDate } from "@/lib/dates";
import { computeGardenPlacement, type AchievementCheckpoint, type PlacementInput, type PointsCheckpoint } from "./placement";
import type { SpeciesCatalogEntry } from "./species-pool";

const catalog: SpeciesCatalogEntry[] = [
  { id: "common-1", rarity: "COMMON", unlockKind: "POINTS", unlockAtPoints: 0, achievementKey: null },
  { id: "common-2", rarity: "COMMON", unlockKind: "POINTS", unlockAtPoints: 40, achievementKey: null },
  { id: "uncommon-1", rarity: "UNCOMMON", unlockKind: "POINTS", unlockAtPoints: 120, achievementKey: null },
  { id: "uncommon-2", rarity: "UNCOMMON", unlockKind: "POINTS", unlockAtPoints: 240, achievementKey: null },
  { id: "rare-1", rarity: "RARE", unlockKind: "ACHIEVEMENT", unlockAtPoints: null, achievementKey: "perfect_week" },
  { id: "legendary-1", rarity: "LEGENDARY", unlockKind: "ACHIEVEMENT", unlockAtPoints: null, achievementKey: "steadfast" },
];

function buildTimeline(days: number, dailyPoints: number, startDate = "2026-01-01"): PointsCheckpoint[] {
  const timeline: PointsCheckpoint[] = [];
  let cumulative = 0;
  let date = startDate;
  for (let i = 0; i < days; i++) {
    cumulative += dailyPoints;
    timeline.push({ localDate: date, cumulativePoints: cumulative });
    date = addDaysToLocalDate(date, 1);
  }
  return timeline;
}

const achievements: AchievementCheckpoint[] = [
  { achievementKey: "perfect_week", earnedOnDate: "2026-01-08" },
  { achievementKey: "steadfast", earnedOnDate: "2026-01-31" },
];

function input(overrides: Partial<PlacementInput> = {}): PlacementInput {
  return {
    gardenSeed: 1234,
    pointsTimeline: buildTimeline(60, 15),
    species: catalog,
    achievementUnlocks: achievements,
    ...overrides,
  };
}

describe("computeGardenPlacement", () => {
  it("produces an identical garden for the same seed and history, always", () => {
    expect(computeGardenPlacement(input())).toEqual(computeGardenPlacement(input()));
  });

  it("produces a different garden for a different seed given the same history", () => {
    const a = computeGardenPlacement(input({ gardenSeed: 1 }));
    const b = computeGardenPlacement(input({ gardenSeed: 2 }));
    expect(a).not.toEqual(b);
  });

  it("never mutates an already-unlocked tile as history grows (write-once)", () => {
    const shortHistory = computeGardenPlacement(input({ pointsTimeline: buildTimeline(20, 15) }));
    const longHistory = computeGardenPlacement(input({ pointsTimeline: buildTimeline(60, 15) }));

    expect(shortHistory.length).toBeGreaterThan(0);
    expect(longHistory.length).toBeGreaterThanOrEqual(shortHistory.length);

    const longByKey = new Map(longHistory.map((tile) => [`${tile.plotIndex}:${tile.x}:${tile.y}`, tile]));
    for (const tile of shortHistory) {
      expect(longByKey.get(`${tile.plotIndex}:${tile.x}:${tile.y}`)).toEqual(tile);
    }
  });

  it("only ever assigns RARE/LEGENDARY species to feature slots, and COMMON/UNCOMMON everywhere else", () => {
    const speciesById = new Map(catalog.map((species) => [species.id, species]));
    for (const tile of computeGardenPlacement(input())) {
      const rarity = speciesById.get(tile.speciesId)!.rarity;
      if (tile.isFeatureSlot) {
        expect(["RARE", "LEGENDARY"]).toContain(rarity);
      } else {
        expect(["COMMON", "UNCOMMON"]).toContain(rarity);
      }
    }
  });

  it("holds a feature slot open until a rare/legendary species is actually available", () => {
    // No achievements earned at all — feature slots must never receive a tile.
    const tiles = computeGardenPlacement(input({ achievementUnlocks: [] }));
    expect(tiles.some((tile) => tile.isFeatureSlot)).toBe(false);
    expect(tiles.some((tile) => !tile.isFeatureSlot)).toBe(true);
  });

  it("returns nothing when there is no history", () => {
    expect(computeGardenPlacement(input({ pointsTimeline: [] }))).toEqual([]);
  });

  it("never assigns a tile whose threshold hasn't been reached yet", () => {
    // Very little history — only a handful of tiles, if any, should unlock.
    const tiles = computeGardenPlacement(input({ pointsTimeline: buildTimeline(1, 10) }));
    expect(tiles.length).toBeLessThan(5);
  });

  it("spans multiple plots once enough points accumulate", () => {
    const tiles = computeGardenPlacement(input({ pointsTimeline: buildTimeline(150, 15) })); // 2250 points
    const plotIndexes = new Set(tiles.map((tile) => tile.plotIndex));
    expect(plotIndexes.size).toBeGreaterThan(1);
  });
});
