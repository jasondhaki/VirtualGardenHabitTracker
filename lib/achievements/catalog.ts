/**
 * Achievement definitions (build plan §6.2, §6.3). Live in code, evaluated
 * against derived history — only earned rows go in `AchievementUnlock`
 * (CLAUDE.md: "Adding an achievement must never require a migration").
 *
 * `key` must match `SPECIES_CATALOG[].achievementKey` in
 * `lib/garden/catalog.ts` exactly — that's the join the placement engine
 * uses to decide a feature slot's species is actually available.
 */
export interface AchievementDefinition {
  key: string;
  name: string;
  description: string;
}

export const ACHIEVEMENT_CATALOG: AchievementDefinition[] = [
  { key: "first_sprout", name: "First Sprout", description: "Logged your first completion." },
  { key: "perfect_week", name: "Perfect Week", description: "7 consecutive 100% days." },
  { key: "fortnight", name: "Fortnight", description: "Reached a 14-day streak." },
  { key: "comeback", name: "Comeback", description: "Rebuilt a 7-day streak after a 7+ day gap." },
  { key: "early_riser", name: "Early Riser", description: "20 completions logged before 8am." },
  { key: "steadfast", name: "Steadfast", description: "Reached a 30-day streak." },
  { key: "polyculture", name: "Polyculture", description: "5+ active habits, all ≥80% over 30 days." },
  { key: "four_seasons", name: "Four Seasons", description: "At least one completion in each season." },
];
