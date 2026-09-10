import { mulberry32 } from "@/lib/prng";
import { plantableCells, type GridCell } from "./grid";

export interface SpiralTile extends GridCell {
  /** 1-based position in unlock order, within a single plot. */
  placementOrder: number;
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Spiral-outward tile order for one plot (build plan §5.1). Cells are
 * grouped into rings by distance from the plot center — ring order is fixed
 * so growth always radiates outward and a tile's ring never changes — then
 * shuffled *within* each ring by the seeded PRNG, which is the "jitter" that
 * keeps two gardens with different seeds from looking identical. Same seed
 * in, same order out, always.
 */
export function spiralOrder(seed: number): SpiralTile[] {
  const rand = mulberry32(seed);

  const rings = new Map<number, GridCell[]>();
  for (const cell of plantableCells()) {
    const ring = rings.get(cell.distanceFromCenter) ?? [];
    ring.push(cell);
    rings.set(cell.distanceFromCenter, ring);
  }

  const ringDistances = [...rings.keys()].sort((a, b) => a - b);

  const ordered: SpiralTile[] = [];
  let placementOrder = 1;
  for (const distance of ringDistances) {
    const ring = rings.get(distance)!;
    const angleSorted = [...ring].sort((a, b) => a.angleFromCenter - b.angleFromCenter);
    for (const cell of shuffle(angleSorted, rand)) {
      ordered.push({ ...cell, placementOrder: placementOrder++ });
    }
  }

  return ordered;
}
