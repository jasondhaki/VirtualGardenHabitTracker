import type { CSSProperties } from "react";
import type { Season } from "@/lib/dates";
import { spriteBackground } from "@/lib/garden/sprites";
import type { PlotRenderModel } from "@/lib/garden/render-data";
import type { WiltTier } from "@/lib/growth/wilt";
import { GardenWeatherOverlay } from "./garden-weather-overlay";

const TILE_PX = 48;

/**
 * Per-tile sway delay (build plan §9.3) so plants don't move in lockstep.
 * The plan's pseudocode uses `%`, which `calc()` can't do — computed here
 * in JS instead and handed to CSS as a custom property.
 */
function swayDelayMs(x: number, y: number): number {
  return (x * 7 + y * 13) % 800;
}

/**
 * Renders one plot as a CSS grid (build plan §9 — sprite-sheet background
 * tiles, no canvas, no `<img>` per tile). `wiltTier` is derived garden-wide
 * from the trailing 14-scheduled-day ratio (CLAUDE.md invariant #1 — never
 * stored) and drives both the plant CSS treatment and the weather overlay;
 * every planted tile in a garden wilts or thrives together, reflecting one
 * shared recent-adherence signal rather than per-plant state. Every cell in
 * `model.cells` covers exactly one (x, y) in the plot by construction —
 * reserved + locked + planted always sums to the full grid — so a missing
 * lookup here would mean the model itself is wrong.
 */
export function GardenPlot({ model, wiltTier, season }: { model: PlotRenderModel; wiltTier: WiltTier; season: Season }) {
  const byCoord = new Map(model.cells.map((cell) => [`${cell.x}:${cell.y}`, cell]));

  return (
    <div className="garden-plot-wrap">
      <div
        className={`garden-grid garden-grid--${wiltTier}`}
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

          const sprayStyle = {
            ...spriteBackground(cell.species.spriteKey, TILE_PX),
            "--sway-delay": `${swayDelayMs(x, y)}ms`,
          } as CSSProperties;

          return (
            <div
              key={`${x}:${y}`}
              className="garden-tile garden-tile--planted"
              style={{ width: TILE_PX, height: TILE_PX }}
              title={`${cell.species.name} (${cell.species.rarity.toLowerCase()}) — unlocked at ${cell.unlockedAtPoints} points`}
            >
              <div className="garden-tile__sprite" style={sprayStyle} />
            </div>
          );
        })}
      </div>

      <GardenWeatherOverlay season={season} wiltTier={wiltTier} />
    </div>
  );
}
