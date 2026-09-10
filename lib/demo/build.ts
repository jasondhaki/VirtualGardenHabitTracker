import { addDaysToLocalDate, todayLocalDate } from "@/lib/dates";
import { computeRollupRange, type RollupCompletionInput, type RollupHabitInput } from "@/lib/rollup/compute";
import { evaluateAchievements, type AchievementCompletionInput, type AchievementHabitInput, type AchievementRollupInput } from "@/lib/achievements/evaluate";
import { SPECIES_CATALOG } from "@/lib/garden/catalog";
import type { SpeciesCatalogEntry } from "@/lib/garden/species-pool";
import type { RenderedSpecies } from "@/lib/garden/render-data";
import { buildDailySnapshots, type DaySnapshot } from "@/lib/garden/snapshots";
import { DEMO_GARDEN_SEED, DEMO_HABITS, DEMO_HISTORY_DAYS, generateDemoCompletions } from "./scenario";

export interface DemoGarden {
  gardenSeed: number;
  /** One entry per day of the 120-day history, oldest first. The last entry is "today." */
  snapshots: DaySnapshot[];
}

/**
 * Zero-DB build of the full demo garden (build plan §13.1 — "a seed script
 * plus a rollup recompute, nothing more"). Runs the exact same pure pipeline
 * `lib/garden/sync.ts` uses for a real user's garden — `computeRollupRange`,
 * `evaluateAchievements`, `buildDailySnapshots` — over the fixed synthetic
 * history in `lib/demo/scenario.ts`. Deliberately never imports `@/lib/db`,
 * `@/auth`, or `lib/garden/sync.ts`: `app/demo/page.tsx` must never touch the
 * database (CLAUDE.md), and this is the module that guarantees it can't.
 *
 * Anchored to `now` (defaults to the real current time) rather than a fixed
 * historical date range, so the demo "looks alive" across rebuilds/ISR
 * revalidations rather than reading as a frozen fixture from launch day.
 */
export function buildDemoGarden(now: Date = new Date()): DemoGarden {
  const endDate = todayLocalDate("UTC", now);
  const startDate = addDaysToLocalDate(endDate, -(DEMO_HISTORY_DAYS - 1));

  const offsetToDate = (dayOffset: number) => addDaysToLocalDate(startDate, dayOffset);

  const rollupHabits: RollupHabitInput[] = DEMO_HABITS.map((habit) => ({
    id: habit.id,
    scheduleMask: habit.scheduleMask,
    targetPerDay: habit.targetPerDay,
    createdLocalDate: startDate,
    archivedLocalDate: null,
  }));

  const completionOffsets = generateDemoCompletions();
  const rollupCompletions: RollupCompletionInput[] = completionOffsets.map((completion) => ({
    habitId: completion.habitId,
    localDate: offsetToDate(completion.dayOffset),
    count: completion.count,
  }));

  const rollupRows = computeRollupRange(startDate, endDate, rollupHabits, rollupCompletions);

  const achievementRollups: AchievementRollupInput[] = rollupRows.map((row) => ({
    localDate: row.localDate,
    scheduled: row.scheduled,
    ratio: row.ratio,
    streakLength: row.streakLength,
  }));
  const achievementCompletions: AchievementCompletionInput[] = completionOffsets.map((completion) => ({
    habitId: completion.habitId,
    localDate: offsetToDate(completion.dayOffset),
    localHour: completion.localHour,
  }));
  const achievementHabits: AchievementHabitInput[] = rollupHabits.map((habit) => ({
    id: habit.id,
    scheduleMask: habit.scheduleMask,
    createdLocalDate: habit.createdLocalDate,
    archivedLocalDate: habit.archivedLocalDate,
  }));

  const achievementUnlocks = evaluateAchievements({
    rollups: achievementRollups,
    completions: achievementCompletions,
    habits: achievementHabits,
  });

  // No DB row exists in this pure path, so `Species.key` stands in for the
  // `cuid` `computeGardenPlacement`/`buildPlotRenderModel` expect as an id —
  // `key` is `@unique` in the real schema, so it's a safe substitute identity.
  const species: SpeciesCatalogEntry[] = SPECIES_CATALOG.map((row) => ({
    id: row.key,
    rarity: row.rarity,
    unlockKind: row.unlockKind,
    unlockAtPoints: row.unlockAtPoints,
    achievementKey: row.achievementKey,
  }));
  const speciesById = new Map<string, RenderedSpecies>(
    SPECIES_CATALOG.map((row) => [row.key, { name: row.name, rarity: row.rarity, spriteKey: row.spriteKey }])
  );

  const snapshots = buildDailySnapshots({
    gardenSeed: DEMO_GARDEN_SEED,
    rollups: rollupRows.map((row) => ({ localDate: row.localDate, pointsEarned: row.pointsEarned, scheduled: row.scheduled, ratio: row.ratio })),
    achievementUnlocks,
    species,
    speciesById,
  });

  return { gardenSeed: DEMO_GARDEN_SEED, snapshots };
}
