import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { formatDbDate, localSeason, todayLocalDate } from "@/lib/dates";
import { ACHIEVEMENT_CATALOG } from "@/lib/achievements/catalog";
import { ensureGardenCurrent } from "@/lib/garden/sync";
import { buildPlotRenderModel, isAwaitingFeatureSlotOnly, nextUnlockThreshold, type RenderedSpecies } from "@/lib/garden/render-data";
import { currentWiltTier } from "@/lib/growth/wilt";
import { GardenPlot } from "@/components/garden/garden-plot";
import { PlotSwitcher } from "@/components/garden/plot-switcher";
import { UnlockFeed, type UnlockFeedEntry } from "@/components/garden/unlock-feed";

// Enough calendar days to guarantee 14 *scheduled* days of wilt history even
// for a habit scheduled just once a week (see lib/growth/wilt.ts).
const WILT_LOOKBACK_ROWS = 120;
const UNLOCK_FEED_SIZE = 5;

export default async function GardenPage({
  searchParams,
}: {
  searchParams: Promise<{ plot?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }
  const userId = session.user.id;

  // No scheduler on Vercel Hobby — tiles and achievements backfill lazily on
  // read, same as rollups. Achievements newly earned during this call get
  // flagged in the unlock feed below.
  const newlyEarnedAchievements = await ensureGardenCurrent(userId);

  const [user, tiles, speciesRows, pointsAgg, recentWiltRows, recentUnlocks] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { gardenSeed: true, currentPlotCount: true, timezone: true } }),
    db.tile.findMany({
      where: { userId },
      select: { plotIndex: true, x: true, y: true, speciesId: true, unlockedAtPoints: true },
    }),
    db.species.findMany({ select: { id: true, name: true, rarity: true, spriteKey: true } }),
    db.dayRollup.aggregate({ where: { userId }, _sum: { pointsEarned: true } }),
    db.dayRollup.findMany({
      where: { userId },
      orderBy: { localDate: "desc" },
      take: WILT_LOOKBACK_ROWS,
      select: { scheduled: true, ratio: true },
    }),
    db.achievementUnlock.findMany({
      where: { userId },
      orderBy: { earnedOnDate: "desc" },
      take: UNLOCK_FEED_SIZE,
      select: { achievementKey: true, earnedOnDate: true },
    }),
  ]);

  if (!user) redirect("/sign-in");

  const speciesById = new Map<string, RenderedSpecies>(
    speciesRows.map((species) => [species.id, { name: species.name, rarity: species.rarity, spriteKey: species.spriteKey }])
  );

  const totalPoints = pointsAgg._sum.pointsEarned ?? 0;
  const plotCount = Math.max(user.currentPlotCount, 1);

  const { plot: plotParam } = await searchParams;
  const requestedPlot = Number(plotParam ?? "1");
  const activePlot = Number.isInteger(requestedPlot) && requestedPlot >= 1 && requestedPlot <= plotCount ? requestedPlot : 1;

  const model = buildPlotRenderModel(user.gardenSeed, activePlot, tiles, speciesById);
  const nextUnlock = nextUnlockThreshold(model);
  const wiltTier = currentWiltTier(recentWiltRows);
  const season = localSeason(todayLocalDate(user.timezone));

  const achievementByKey = new Map(ACHIEVEMENT_CATALOG.map((achievement) => [achievement.key, achievement]));
  const newlyEarnedKeys = new Set(newlyEarnedAchievements.map((achievement) => achievement.achievementKey));
  const unlockFeedEntries: UnlockFeedEntry[] = recentUnlocks.flatMap((row) => {
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

      {plotCount > 1 ? <PlotSwitcher plotCount={plotCount} activePlot={activePlot} /> : null}

      <GardenPlot model={model} wiltTier={wiltTier} season={season} />

      {nextUnlock !== null ? (
        <p className="text-sm text-gray-500">{Math.max(nextUnlock - totalPoints, 0)} points until your next plant.</p>
      ) : isAwaitingFeatureSlotOnly(model) ? (
        <p className="text-sm text-gray-500">Every common plot is full — what&apos;s left here only grows from a rare achievement.</p>
      ) : (
        <p className="text-sm text-gray-500">This plot is fully planted.</p>
      )}

      <UnlockFeed entries={unlockFeedEntries} />
    </main>
  );
}
