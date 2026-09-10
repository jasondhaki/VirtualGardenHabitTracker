import { PLOT_SIZE, reservedCells } from "./grid";
import { deriveSeed } from "./seed";
import { spiralOrder } from "./spiral";
import type { SpeciesRarity } from "./species-pool";
import { tileUnlockPoints } from "./unlock-thresholds";

export interface RenderedSpecies {
  name: string;
  rarity: SpeciesRarity;
  spriteKey: string;
}

export interface TileForRender {
  plotIndex: number;
  x: number;
  y: number;
  speciesId: string;
  unlockedAtPoints: number;
}

export type RenderedCell =
  | { kind: "reserved"; x: number; y: number }
  | { kind: "locked"; x: number; y: number; isFeatureSlot: boolean; unlocksAtPoints: number }
  | {
      kind: "planted";
      x: number;
      y: number;
      isFeatureSlot: boolean;
      species: RenderedSpecies;
      unlockedAtPoints: number;
    };

export interface PlotRenderModel {
  plotIndex: number;
  size: number;
  cells: RenderedCell[];
}

/**
 * Merge fixed plot geometry with a user's persisted tiles into something a
 * component can render directly. Re-derives each cell's spiral position and
 * unlock threshold with the exact same seed and salt the placement engine
 * used to assign it (see `lib/garden/placement.ts`), so a locked cell's
 * displayed threshold always matches what will actually unlock it.
 */
export function buildPlotRenderModel(
  gardenSeed: number,
  plotIndex: number,
  tiles: TileForRender[],
  speciesById: ReadonlyMap<string, RenderedSpecies>
): PlotRenderModel {
  const order = spiralOrder(deriveSeed(gardenSeed, plotIndex));
  const plantedByCoord = new Map(
    tiles.filter((tile) => tile.plotIndex === plotIndex).map((tile) => [`${tile.x}:${tile.y}`, tile])
  );

  const cells: RenderedCell[] = order.map((cell) => {
    const planted = plantedByCoord.get(`${cell.x}:${cell.y}`);
    if (!planted) {
      return {
        kind: "locked",
        x: cell.x,
        y: cell.y,
        isFeatureSlot: cell.isFeatureSlot,
        unlocksAtPoints: tileUnlockPoints(plotIndex, cell.placementOrder),
      };
    }

    const species = speciesById.get(planted.speciesId);
    if (!species) throw new Error(`Unknown species id "${planted.speciesId}" for a planted tile`);

    return {
      kind: "planted",
      x: cell.x,
      y: cell.y,
      isFeatureSlot: cell.isFeatureSlot,
      species,
      unlockedAtPoints: planted.unlockedAtPoints,
    };
  });

  for (const reserved of reservedCells()) {
    cells.push({ kind: "reserved", x: reserved.x, y: reserved.y });
  }

  return { plotIndex, size: PLOT_SIZE, cells };
}

/**
 * The lowest still-locked, points-reachable threshold in a plot, or `null`
 * if none remain. Feature slots are deliberately excluded: their numeric
 * threshold is necessary but not sufficient (they also need a RARE/LEGENDARY
 * species from an earned achievement — build plan §5.2), so surfacing it as
 * "N points until your next plant" would be misleading once that threshold
 * has already passed and the slot is still waiting on an achievement.
 */
export function nextUnlockThreshold(model: PlotRenderModel): number | null {
  let min: number | null = null;
  for (const cell of model.cells) {
    if (cell.kind !== "locked" || cell.isFeatureSlot) continue;
    if (min === null || cell.unlocksAtPoints < min) min = cell.unlocksAtPoints;
  }
  return min;
}

/** Whether every locked cell remaining in a plot is a feature slot. */
export function isAwaitingFeatureSlotOnly(model: PlotRenderModel): boolean {
  const locked = model.cells.filter((cell): cell is Extract<RenderedCell, { kind: "locked" }> => cell.kind === "locked");
  return locked.length > 0 && locked.every((cell) => cell.isFeatureSlot);
}
