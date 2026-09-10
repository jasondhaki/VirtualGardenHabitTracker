import { describe, expect, it } from "vitest";
import { mulberry32 } from "@/lib/prng";
import { eligibleSpecies, isSpeciesUnlockedAsOf, pickSpecies, type SpeciesCatalogEntry } from "./species-pool";

const catalog: SpeciesCatalogEntry[] = [
  { id: "common-1", rarity: "COMMON", unlockKind: "POINTS", unlockAtPoints: 0, achievementKey: null },
  { id: "common-2", rarity: "COMMON", unlockKind: "POINTS", unlockAtPoints: 40, achievementKey: null },
  { id: "uncommon-1", rarity: "UNCOMMON", unlockKind: "POINTS", unlockAtPoints: 120, achievementKey: null },
  { id: "rare-1", rarity: "RARE", unlockKind: "ACHIEVEMENT", unlockAtPoints: null, achievementKey: "perfect_week" },
  { id: "legendary-1", rarity: "LEGENDARY", unlockKind: "ACHIEVEMENT", unlockAtPoints: null, achievementKey: "steadfast" },
];

describe("isSpeciesUnlockedAsOf", () => {
  it("unlocks a points-track species once the threshold is met", () => {
    const species = catalog[1]; // common-2, unlockAtPoints: 40
    expect(isSpeciesUnlockedAsOf(species, 39, new Set())).toBe(false);
    expect(isSpeciesUnlockedAsOf(species, 40, new Set())).toBe(true);
  });

  it("unlocks an achievement-track species only once its key is earned", () => {
    const species = catalog[3]; // rare-1
    expect(isSpeciesUnlockedAsOf(species, 10_000, new Set())).toBe(false);
    expect(isSpeciesUnlockedAsOf(species, 0, new Set(["perfect_week"]))).toBe(true);
  });
});

describe("eligibleSpecies", () => {
  it("restricts feature slots to RARE/LEGENDARY only", () => {
    const pool = eligibleSpecies(catalog, true, 1000, new Set(["perfect_week", "steadfast"]));
    expect(pool.map((s) => s.id).sort()).toEqual(["legendary-1", "rare-1"]);
  });

  it("restricts non-feature slots to COMMON/UNCOMMON only", () => {
    const pool = eligibleSpecies(catalog, false, 1000, new Set(["perfect_week", "steadfast"]));
    expect(pool.map((s) => s.id).sort()).toEqual(["common-1", "common-2", "uncommon-1"]);
  });

  it("excludes species not yet unlocked", () => {
    const pool = eligibleSpecies(catalog, false, 10, new Set());
    expect(pool.map((s) => s.id)).toEqual(["common-1"]);
  });
});

describe("pickSpecies", () => {
  it("returns null for an empty pool", () => {
    expect(pickSpecies([], [], mulberry32(1))).toBeNull();
  });

  it("always returns a candidate from the pool", () => {
    const rand = mulberry32(5);
    const pool = catalog.slice(0, 2);
    for (let i = 0; i < 50; i++) {
      const picked = pickSpecies(pool, [], rand);
      expect(pool).toContain(picked);
    }
  });

  it("still can return a recently-used species rather than getting stuck", () => {
    const rand = mulberry32(2);
    const pool = [catalog[0]];
    expect(pickSpecies(pool, ["common-1", "common-1", "common-1"], rand)).toBe(catalog[0]);
  });
});
