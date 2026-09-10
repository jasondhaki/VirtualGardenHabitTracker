import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { buildPlotRenderModel, type RenderedSpecies } from "@/lib/garden/render-data";
import type { SpeciesRarity } from "@/lib/garden/species-pool";

export const alt = "A pixel-art habit garden";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Light ISR cache: this route is public and unauthenticated, so unfurl bots
// (Slack/Discord/iMessage) can hit it repeatedly per share. A short cache
// keeps that from becoming a repeat-read cost on every unfurl.
export const revalidate = 3600;

const RARITY_COLOR: Record<SpeciesRarity, string> = {
  COMMON: "#8bc34a",
  UNCOMMON: "#4fc3f7",
  RARE: "#ab47bc",
  LEGENDARY: "#ffca28",
};
const LOCKED_COLOR = "#4a4536";
const RESERVED_COLOR = "#2f2a1f";
const CELL_PX = 42;
const CELL_GAP = 3;

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  const user = await db.user.findUnique({ where: { username }, select: { id: true, gardenSeed: true } });
  if (!user) notFound();

  // Read-only, deliberately: this route never calls `ensureGardenCurrent` —
  // an anonymous, bot-driven request is the wrong trigger for a DB-write
  // backfill path. Freshness lags slightly behind the owner's last real
  // `/garden` visit, which is an acceptable tradeoff for a share card.
  const [tiles, speciesRows, pointsAgg] = await Promise.all([
    db.tile.findMany({
      where: { userId: user.id, plotIndex: 1 },
      select: { plotIndex: true, x: true, y: true, speciesId: true, unlockedAtPoints: true },
    }),
    db.species.findMany({ select: { id: true, name: true, rarity: true, spriteKey: true } }),
    db.dayRollup.aggregate({ where: { userId: user.id }, _sum: { pointsEarned: true } }),
  ]);

  const speciesById = new Map<string, RenderedSpecies>(
    speciesRows.map((species) => [species.id, { name: species.name, rarity: species.rarity, spriteKey: species.spriteKey }])
  );
  const model = buildPlotRenderModel(user.gardenSeed, 1, tiles, speciesById);
  const totalPoints = pointsAgg._sum.pointsEarned ?? 0;

  const byCoord = new Map(model.cells.map((cell) => [`${cell.x}:${cell.y}`, cell]));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 64,
          background: "#1c1810",
          padding: 64,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", fontSize: 56, fontWeight: 700, color: "#f5f0e6" }}>🌱 Habit Garden</div>
          <div style={{ display: "flex", fontSize: 32, color: "#c9c2ae" }}>@{username}</div>
          <div style={{ display: "flex", fontSize: 28, color: "#8f8872" }}>{totalPoints} points earned</div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: CELL_GAP,
            padding: 12,
            background: "#2f2a1f",
            borderRadius: 12,
          }}
        >
          {Array.from({ length: model.size }, (_, y) => (
            <div key={y} style={{ display: "flex", flexDirection: "row", gap: CELL_GAP }}>
              {Array.from({ length: model.size }, (_, x) => {
                const cell = byCoord.get(`${x}:${y}`);
                const color =
                  cell?.kind === "planted" ? RARITY_COLOR[cell.species.rarity] : cell?.kind === "locked" ? LOCKED_COLOR : RESERVED_COLOR;
                return (
                  <div
                    key={x}
                    style={{
                      display: "flex",
                      width: CELL_PX,
                      height: CELL_PX,
                      background: color,
                      borderRadius: 4,
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
