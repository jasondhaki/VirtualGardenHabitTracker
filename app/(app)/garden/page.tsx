import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { compareLocalDates, formatDbDate, localSeason, todayLocalDate } from "@/lib/dates";
import { ACHIEVEMENT_CATALOG } from "@/lib/achievements/catalog";
import { ensureGardenCurrent } from "@/lib/garden/sync";
import {
  buildPlotRenderModel,
  isAwaitingFeatureSlotOnly,
  nextUnlockThreshold,
  type PlotRenderModel,
  type RenderedSpecies,
} from "@/lib/garden/render-data";
import { buildDailySnapshots, type DaySnapshot } from "@/lib/garden/snapshots";
import type { SpeciesCatalogEntry } from "@/lib/garden/species-pool";
import { currentWiltTier } from "@/lib/growth/wilt";
import { TimelineScrubber } from "@/components/garden/timeline-scrubber";
import { UnlockFeed, type UnlockFeedEntry } from "@/components/garden/unlock-feed";

// Total scrubber days (historical + today) — build plan §13.3: "drag through 90 days."
const SCRUBBER_WINDOW_DAYS = 90;
const UNLOCK_FEED_SIZE = 5;

export default async function GardenPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }
  const userId = session.user.id;

  // No scheduler on Vercel Hobby — tiles and achievements backfill lazily on
  // read, same as rollups. Achievements newly earned during this call get
  // flagged in the unlock feed below.
  const newlyEarnedAchievements = await ensureGardenCurrent(userId);

  const [user, tiles, speciesRows, rollupRows, achievementRows] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { gardenSeed: true, currentPlotCount: true, timezone: true } }),
    db.tile.findMany({
      where: { userId },
      select: { plotIndex: true, x: true, y: true, speciesId: true, unlockedAtPoints: true },
    }),
    db.species.findMany({
      select: { id: true, name: true, rarity: true, spriteKey: true, unlockKind: true, unlockAtPoints: true, achievementKey: true },
    }),
    db.dayRollup.findMany({
      where: { userId },
      orderBy: { localDate: "asc" },
      select: { localDate: true, scheduled: true, ratio: true, pointsEarned: true },
    }),
    // At most 8 rows ever — one per key in ACHIEVEMENT_CATALOG (write-once, CLAUDE.md invariant #1).
    db.achievementUnlock.findMany({ where: { userId }, select: { achievementKey: true, earnedOnDate: true } }),
  ]);

  if (!user) redirect("/sign-in");

  const speciesById = new Map<string, RenderedSpecies>(
    speciesRows.map((species) => [species.id, { name: species.name, rarity: species.rarity, spriteKey: species.spriteKey }])
  );
  const speciesCatalog: SpeciesCatalogEntry[] = speciesRows.map((species) => ({
    id: species.id,
    rarity: species.rarity,
    unlockKind: species.unlockKind,
    unlockAtPoints: species.unlockAtPoints,
    achievementKey: species.achievementKey,
  }));

  const totalPoints = rollupRows.reduce((sum, row) => sum + row.pointsEarned, 0);
  const plotCount = Math.max(user.currentPlotCount, 1);
  const today = todayLocalDate(user.timezone);
  const season = localSeason(today);

  const todayPlots: PlotRenderModel[] = [];
  for (let plotIndex = 1; plotIndex <= plotCount; plotIndex++) {
    todayPlots.push(buildPlotRenderModel(user.gardenSeed, plotIndex, tiles, speciesById));
  }
  const wiltTier = currentWiltTier([...rollupRows].reverse());
  const todaySnapshot: DaySnapshot = { localDate: today, totalPoints, wiltTier, season, plots: todayPlots };

  // Build historical snapshots from every rollup row *except* today's (if it
  // already exists — today only gets a `DayRollup` row once something is
  // completed, see lib/rollup/ensure-current.ts). `todaySnapshot` above is
  // built straight from the persisted `Tile` table, the actual source of
  // truth, rather than recomputed — the two should always agree by the
  // write-once invariant, but "today" should never be a stand-in.
  const historicalRows = rollupRows.filter((row) => formatDbDate(row.localDate) !== today);
  const achievementUnlocks = achievementRows.map((row) => ({
    achievementKey: row.achievementKey,
    earnedOnDate: formatDbDate(row.earnedOnDate),
  }));
  const historicalSnapshots = buildDailySnapshots({
    gardenSeed: user.gardenSeed,
    rollups: historicalRows.map((row) => ({
      localDate: formatDbDate(row.localDate),
      pointsEarned: row.pointsEarned,
      scheduled: row.scheduled,
      ratio: row.ratio,
    })),
    achievementUnlocks,
    species: speciesCatalog,
    speciesById,
    windowDays: SCRUBBER_WINDOW_DAYS - 1,
  });

  const snapshots = [...historicalSnapshots, todaySnapshot];

  const nextUnlock = todayPlots.reduce<number | null>((min, plot) => {
    const plotNext = nextUnlockThreshold(plot);
    if (plotNext === null) return min;
    return min === null ? plotNext : Math.min(min, plotNext);
  }, null);
  const awaitingFeatureSlotOnly = nextUnlock === null && todayPlots.some(isAwaitingFeatureSlotOnly);

  const achievementByKey = new Map(ACHIEVEMENT_CATALOG.map((achievement) => [achievement.key, achievement]));
  const newlyEarnedKeys = new Set(newlyEarnedAchievements.map((achievement) => achievement.achievementKey));
  const unlockFeedEntries: UnlockFeedEntry[] = achievementRows
    .slice()
    .sort((a, b) => compareLocalDates(formatDbDate(b.earnedOnDate), formatDbDate(a.earnedOnDate)))
    .slice(0, UNLOCK_FEED_SIZE)
    .flatMap((row) => {
      const catalogEntry = achievementByKey.get(row.achievementKey);
      if (!catalogEntry) return [];
      return [
        {
          key: row.achievementKey,
          name: catalogEntry.name,
          description: catalogEntry.description,
          earnedOnDate: formatDbDate(row.earnedOnDate),
          isNew: newlyEarnedKeys.has(row.achievementKey),
        },
      ];
    });

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Garden</h1>
        <p className="text-sm text-gray-500">{totalPoints} points earned</p>
      </div>

      <TimelineScrubber snapshots={snapshots} />

      {nextUnlock !== null ? (
        <p className="text-sm text-gray-500">{Math.max(nextUnlock - totalPoints, 0)} points until your next plant.</p>
      ) : awaitingFeatureSlotOnly ? (
        <p className="text-sm text-gray-500">Every common plot is full — what&apos;s left here only grows from a rare achievement.</p>
      ) : (
        <p className="text-sm text-gray-500">Every plot is fully planted.</p>
      )}

      <UnlockFeed entries={unlockFeedEntries} />
    </main>
  );
}
