import { spriteBackground } from "@/lib/garden/sprites";
import type { PlotRenderModel } from "@/lib/garden/render-data";

const TILE_PX = 48;

/**
 * Renders one plot as a static CSS grid (build plan §9 — P5 scope is static
 * plants reflecting real derived state; sway, wilt tiers and weather
 * overlays are P6). Every cell in `model.cells` covers exactly one (x, y) in
 * the plot by construction — reserved + locked + planted always sums to the
 * full grid — so a missing lookup here would mean the model itself is wrong.
 */
export function GardenPlot({ model }: { model: PlotRenderModel }) {
  const byCoord = new Map(model.cells.map((cell) => [`${cell.x}:${cell.y}`, cell]));

  return (
    <div
      className="garden-grid"
      style={{
        gridTemplateColumns: `repeat(${model.size}, ${TILE_PX}px)`,
        gridTemplateRows: `repeat(${model.size}, ${TILE_PX}px)`,
      }}
    >
      {Array.from({ length: model.size * model.size }, (_, index) => {
        const x = index % model.size;
        const y = Math.floor(index / model.size);
        const cell = byCoord.get(`${x}:${y}`)!;

        if (cell.kind === "reserved") {
          return <div key={`${x}:${y}`} className="garden-tile garden-tile--reserved" style={{ width: TILE_PX, height: TILE_PX }} aria-hidden />;
        }

        if (cell.kind === "locked") {
          return (
            <div
              key={`${x}:${y}`}
              className="garden-tile garden-tile--locked"
              style={{ width: TILE_PX, height: TILE_PX }}
              title={`Unlocks at ${cell.unlocksAtPoints} points`}
            />
          );
        }

        return (
          <div
            key={`${x}:${y}`}
            className="garden-tile garden-tile--planted"
            style={{ width: TILE_PX, height: TILE_PX }}
            title={`${cell.species.name} (${cell.species.rarity.toLowerCase()}) — unlocked at ${cell.unlockedAtPoints} points`}
          >
            <div className="garden-tile__sprite" style={spriteBackground(cell.species.spriteKey, TILE_PX)} />
          </div>
        );
      })}
    </div>
  );
}
