import { describe, expect, it } from "vitest";
import { buildPlotRenderModel, isAwaitingFeatureSlotOnly, nextUnlockThreshold, type TileForRender, type RenderedSpecies } from "./render-data";
import { deriveSeed } from "./seed";
import { spiralOrder } from "./spiral";
import { tileUnlockPoints } from "./unlock-thresholds";

const GARDEN_SEED = 4242;
const SPECIES = new Map<string, RenderedSpecies>([["sp-clover", { name: "Clover", rarity: "COMMON", spriteKey: "clover" }]]);

describe("buildPlotRenderModel", () => {
  it("covers the full 6x6 grid as reserved + locked when nothing is planted", () => {
    const model = buildPlotRenderModel(GARDEN_SEED, 1, [], SPECIES);

    expect(model.cells).toHaveLength(36);
    expect(model.cells.filter((c) => c.kind === "reserved")).toHaveLength(4);
    expect(model.cells.filter((c) => c.kind === "locked")).toHaveLength(32);
    expect(model.cells.filter((c) => c.kind === "planted")).toHaveLength(0);
  });

  it("labels each locked cell with the exact threshold that will unlock it", () => {
    const order = spiralOrder(deriveSeed(GARDEN_SEED, 1));
    const model = buildPlotRenderModel(GARDEN_SEED, 1, [], SPECIES);

    for (const cell of order) {
      const rendered = model.cells.find((c) => c.x === cell.x && c.y === cell.y);
      expect(rendered?.kind).toBe("locked");
      expect(rendered).toMatchObject({ unlocksAtPoints: tileUnlockPoints(1, cell.placementOrder) });
    }
  });

  it("marks a persisted tile's coordinate as planted with its species", () => {
    const order = spiralOrder(deriveSeed(GARDEN_SEED, 1));
    const firstCell = order[0];
    const tiles: TileForRender[] = [
      { plotIndex: 1, x: firstCell.x, y: firstCell.y, speciesId: "sp-clover", unlockedAtPoints: 10 },
    ];

    const model = buildPlotRenderModel(GARDEN_SEED, 1, tiles, SPECIES);
    const planted = model.cells.find((c) => c.x === firstCell.x && c.y === firstCell.y);

    expect(planted).toEqual({
      kind: "planted",
      x: firstCell.x,
      y: firstCell.y,
      isFeatureSlot: firstCell.isFeatureSlot,
      species: { name: "Clover", rarity: "COMMON", spriteKey: "clover" },
      unlockedAtPoints: 10,
    });
    expect(model.cells.filter((c) => c.kind === "locked")).toHaveLength(31);
  });

  it("throws if a persisted tile references a species not in the lookup", () => {
    const order = spiralOrder(deriveSeed(GARDEN_SEED, 1));
    const tiles: TileForRender[] = [{ plotIndex: 1, x: order[0].x, y: order[0].y, speciesId: "unknown", unlockedAtPoints: 10 }];

    expect(() => buildPlotRenderModel(GARDEN_SEED, 1, tiles, SPECIES)).toThrow();
  });

  it("ignores tiles belonging to a different plot", () => {
    const model = buildPlotRenderModel(GARDEN_SEED, 1, [{ plotIndex: 2, x: 1, y: 1, speciesId: "sp-clover", unlockedAtPoints: 10 }], SPECIES);

    expect(model.cells.filter((c) => c.kind === "planted")).toHaveLength(0);
  });
});

describe("nextUnlockThreshold", () => {
  it("returns the lowest locked, non-feature-slot threshold in the plot", () => {
    const model = buildPlotRenderModel(GARDEN_SEED, 1, [], SPECIES);
    const order = spiralOrder(deriveSeed(GARDEN_SEED, 1));
    const expectedMin = Math.min(
      ...order.filter((cell) => !cell.isFeatureSlot).map((cell) => tileUnlockPoints(1, cell.placementOrder))
    );

    expect(nextUnlockThreshold(model)).toBe(expectedMin);
  });

  it("ignores feature slots even when they're the only locked cells left", () => {
    const order = spiralOrder(deriveSeed(GARDEN_SEED, 1));
    const tiles: TileForRender[] = order
      .filter((cell) => !cell.isFeatureSlot)
      .map((cell) => ({
        plotIndex: 1,
        x: cell.x,
        y: cell.y,
        speciesId: "sp-clover",
        unlockedAtPoints: tileUnlockPoints(1, cell.placementOrder),
      }));

    const model = buildPlotRenderModel(GARDEN_SEED, 1, tiles, SPECIES);
    expect(nextUnlockThreshold(model)).toBeNull();
    expect(isAwaitingFeatureSlotOnly(model)).toBe(true);
  });

  it("returns null once every plantable tile in the plot is planted", () => {
    const order = spiralOrder(deriveSeed(GARDEN_SEED, 1));
    const tiles: TileForRender[] = order.map((cell) => ({
      plotIndex: 1,
      x: cell.x,
      y: cell.y,
      speciesId: "sp-clover",
      unlockedAtPoints: tileUnlockPoints(1, cell.placementOrder),
    }));

    const model = buildPlotRenderModel(GARDEN_SEED, 1, tiles, SPECIES);
    expect(nextUnlockThreshold(model)).toBeNull();
    expect(isAwaitingFeatureSlotOnly(model)).toBe(false);
  });
});
