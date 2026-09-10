import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ensureGardenCurrent } from "@/lib/garden/sync";
import { buildPlotRenderModel, isAwaitingFeatureSlotOnly, nextUnlockThreshold, type RenderedSpecies } from "@/lib/garden/render-data";
import { GardenPlot } from "@/components/garden/garden-plot";
import { PlotSwitcher } from "@/components/garden/plot-switcher";

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

  // No scheduler on Vercel Hobby — tiles backfill lazily on read, same as rollups.
  await ensureGardenCurrent(userId);

  const [user, tiles, speciesRows, pointsAgg] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { gardenSeed: true, currentPlotCount: true } }),
    db.tile.findMany({
      where: { userId },
      select: { plotIndex: true, x: true, y: true, speciesId: true, unlockedAtPoints: true },
    }),
    db.species.findMany({ select: { id: true, name: true, rarity: true, spriteKey: true } }),
    db.dayRollup.aggregate({ where: { userId }, _sum: { pointsEarned: true } }),
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

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Garden</h1>
        <p className="text-sm text-gray-500">{totalPoints} points earned</p>
      </div>

      {plotCount > 1 ? <PlotSwitcher plotCount={plotCount} activePlot={activePlot} /> : null}

      <GardenPlot model={model} />

      {nextUnlock !== null ? (
        <p className="text-sm text-gray-500">{Math.max(nextUnlock - totalPoints, 0)} points until your next plant.</p>
      ) : isAwaitingFeatureSlotOnly(model) ? (
        <p className="text-sm text-gray-500">Every common plot is full — what's left here only grows from a rare achievement.</p>
      ) : (
        <p className="text-sm text-gray-500">This plot is fully planted.</p>
      )}
    </main>
  );
}
