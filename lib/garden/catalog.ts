import type { SpeciesRarity, SpeciesUnlockKind } from "./species-pool";
import type { SpriteKey } from "./sprites";

export interface SpeciesCatalogRow {
  key: string;
  name: string;
  rarity: SpeciesRarity;
  unlockKind: SpeciesUnlockKind;
  unlockAtPoints: number | null;
  achievementKey: string | null;
  spriteKey: SpriteKey;
}

/**
 * The full species roster (build plan §6) — the single source `prisma/seed.ts`
 * upserts from, keyed by `key` so reseeding is idempotent. Adding a row here
 * and reseeding never requires a migration (CLAUDE.md: "Achievements live in
 * code"; species live in code the same way).
 *
 * Point-gated species drip roughly every 40 points across the 450-point
 * starter plot (§6.1). Achievement-gated species (§6.2) are earned, never
 * bought, and land only in feature slots — `first-sprout` is the deliberate
 * exception: it's COMMON so it plants like any other early tile the moment
 * the very first completion is logged.
 */
export const SPECIES_CATALOG: SpeciesCatalogRow[] = [
  { key: "clover", name: "Clover", rarity: "COMMON", unlockKind: "POINTS", unlockAtPoints: 0, achievementKey: null, spriteKey: "clover" },
  { key: "daisy", name: "Daisy", rarity: "COMMON", unlockKind: "POINTS", unlockAtPoints: 40, achievementKey: null, spriteKey: "daisy" },
  { key: "marigold", name: "Marigold", rarity: "COMMON", unlockKind: "POINTS", unlockAtPoints: 80, achievementKey: null, spriteKey: "marigold" },
  { key: "lavender", name: "Lavender", rarity: "UNCOMMON", unlockKind: "POINTS", unlockAtPoints: 120, achievementKey: null, spriteKey: "lavender" },
  { key: "sunflower", name: "Sunflower", rarity: "COMMON", unlockKind: "POINTS", unlockAtPoints: 160, achievementKey: null, spriteKey: "sunflower" },
  { key: "fern", name: "Fern", rarity: "UNCOMMON", unlockKind: "POINTS", unlockAtPoints: 200, achievementKey: null, spriteKey: "fern" },
  { key: "tulip", name: "Tulip", rarity: "COMMON", unlockKind: "POINTS", unlockAtPoints: 240, achievementKey: null, spriteKey: "tulip" },
  { key: "bamboo", name: "Bamboo", rarity: "UNCOMMON", unlockKind: "POINTS", unlockAtPoints: 280, achievementKey: null, spriteKey: "bamboo" },
  { key: "wisteria", name: "Wisteria", rarity: "UNCOMMON", unlockKind: "POINTS", unlockAtPoints: 320, achievementKey: null, spriteKey: "wisteria" },
  {
    key: "maple-sapling",
    name: "Maple Sapling",
    rarity: "UNCOMMON",
    unlockKind: "POINTS",
    unlockAtPoints: 360,
    achievementKey: null,
    spriteKey: "maple-sapling",
  },
  {
    key: "cherry-blossom",
    name: "Cherry Blossom",
    rarity: "UNCOMMON",
    unlockKind: "POINTS",
    unlockAtPoints: 400,
    achievementKey: null,
    spriteKey: "cherry-blossom",
  },

  // Achievement-gated — never announced in advance (build plan §6.2).
  {
    key: "first-sprout",
    name: "First Sprout",
    rarity: "COMMON",
    unlockKind: "ACHIEVEMENT",
    unlockAtPoints: null,
    achievementKey: "first_sprout",
    spriteKey: "first-sprout",
  },
  {
    key: "dew-orchid",
    name: "Dew Orchid",
    rarity: "RARE",
    unlockKind: "ACHIEVEMENT",
    unlockAtPoints: null,
    achievementKey: "perfect_week",
    spriteKey: "dew-orchid",
  },
  {
    key: "moonflower",
    name: "Moonflower",
    rarity: "RARE",
    unlockKind: "ACHIEVEMENT",
    unlockAtPoints: null,
    achievementKey: "fortnight",
    spriteKey: "moonflower",
  },
  {
    key: "phoenix-lily",
    name: "Phoenix Lily",
    rarity: "RARE",
    unlockKind: "ACHIEVEMENT",
    unlockAtPoints: null,
    achievementKey: "comeback",
    spriteKey: "phoenix-lily",
  },
  {
    key: "sunrise-poppy",
    name: "Sunrise Poppy",
    rarity: "RARE",
    unlockKind: "ACHIEVEMENT",
    unlockAtPoints: null,
    achievementKey: "early_riser",
    spriteKey: "sunrise-poppy",
  },
  {
    key: "ironwood",
    name: "Ironwood",
    rarity: "LEGENDARY",
    unlockKind: "ACHIEVEMENT",
    unlockAtPoints: null,
    achievementKey: "steadfast",
    spriteKey: "ironwood",
  },
  {
    key: "rainbow-canopy",
    name: "Rainbow Canopy",
    rarity: "LEGENDARY",
    unlockKind: "ACHIEVEMENT",
    unlockAtPoints: null,
    achievementKey: "polyculture",
    spriteKey: "rainbow-canopy",
  },
  {
    key: "world-tree",
    name: "World Tree",
    rarity: "LEGENDARY",
    unlockKind: "ACHIEVEMENT",
    unlockAtPoints: null,
    achievementKey: "four_seasons",
    spriteKey: "world-tree",
  },
];
