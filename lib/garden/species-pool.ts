/**
 * Species eligibility and weighted selection (build plan §5.2, §6). Feature
 * slots only ever draw from RARE/LEGENDARY species — that's what makes a
 * hard-earned achievement actually visible instead of buried in a hedge.
 * Everything else draws from COMMON/UNCOMMON. A mild recency penalty keeps
 * the same species from clustering across neighboring tiles.
 */

export type SpeciesRarity = "COMMON" | "UNCOMMON" | "RARE" | "LEGENDARY";
export type SpeciesUnlockKind = "POINTS" | "ACHIEVEMENT";

export interface SpeciesCatalogEntry {
  id: string;
  rarity: SpeciesRarity;
  unlockKind: SpeciesUnlockKind;
  unlockAtPoints: number | null;
  achievementKey: string | null;
}

const FEATURE_SLOT_RARITIES = new Set<SpeciesRarity>(["RARE", "LEGENDARY"]);

export function isSpeciesUnlockedAsOf(
  species: SpeciesCatalogEntry,
  cumulativePoints: number,
  earnedAchievementKeys: ReadonlySet<string>
): boolean {
  if (species.unlockKind === "POINTS") {
    return species.unlockAtPoints !== null && cumulativePoints >= species.unlockAtPoints;
  }
  return species.achievementKey !== null && earnedAchievementKeys.has(species.achievementKey);
}

export function eligibleSpecies(
  catalog: SpeciesCatalogEntry[],
  isFeatureSlot: boolean,
  cumulativePoints: number,
  earnedAchievementKeys: ReadonlySet<string>
): SpeciesCatalogEntry[] {
  return catalog.filter((species) => {
    const rarityMatches = FEATURE_SLOT_RARITIES.has(species.rarity) === isFeatureSlot;
    return rarityMatches && isSpeciesUnlockedAsOf(species, cumulativePoints, earnedAchievementKeys);
  });
}

const RECENCY_PENALTY_WINDOW = 3;
const RECENCY_PENALTY_WEIGHT = 0.3;

/**
 * Weighted pick among `candidates`, using `rand()` for exactly one draw.
 * Species used in the last `RECENCY_PENALTY_WINDOW` picks from this same
 * pool get a reduced (not zero) weight, so clustering is discouraged
 * without ever making a species unreachable when the pool is small.
 */
export function pickSpecies(
  candidates: SpeciesCatalogEntry[],
  recentSpeciesIds: readonly string[],
  rand: () => number
): SpeciesCatalogEntry | null {
  if (candidates.length === 0) return null;

  const recent = new Set(recentSpeciesIds.slice(-RECENCY_PENALTY_WINDOW));
  const weights = candidates.map((species) => (recent.has(species.id) ? RECENCY_PENALTY_WEIGHT : 1));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  let roll = rand() * totalWeight;
  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}
