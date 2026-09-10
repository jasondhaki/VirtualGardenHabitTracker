/**
 * Static 6x6 plot geometry (build plan §4.1, §5.2). Every plot a user
 * unlocks reuses this same shape — 36 cells, 4 reserved for pond/path
 * decoration, 32 plantable, 5 of those marked as feature slots reserved for
 * rare/legendary species. None of this depends on the seed: layout shape is
 * structural, only *ordering* and *species* are seeded.
 */

export const PLOT_SIZE = 6;

const CENTER_X = (PLOT_SIZE - 1) / 2;
const CENTER_Y = (PLOT_SIZE - 1) / 2;

// The 4 corners are reserved for pond + path decoration, never plantable.
const RESERVED_CELLS = new Set(["0,0", "5,0", "0,5", "5,5"]);

// Center cell, plus one near each third of the plot (build plan §5.2).
const FEATURE_SLOT_CELLS = new Set(["2,2", "1,1", "4,1", "1,4", "4,4"]);

export interface GridCell {
  x: number;
  y: number;
  isFeatureSlot: boolean;
  /** Chebyshev distance from plot center — cells at the same distance form one "ring". */
  distanceFromCenter: number;
  angleFromCenter: number;
}

export interface ReservedCell {
  x: number;
  y: number;
}

/** The 4 pond/path corners excluded from `plantableCells` (build plan §4.1). */
export function reservedCells(): ReservedCell[] {
  return [...RESERVED_CELLS].map((key) => {
    const [x, y] = key.split(",").map(Number);
    return { x, y };
  });
}

export function plantableCells(): GridCell[] {
  const cells: GridCell[] = [];
  for (let x = 0; x < PLOT_SIZE; x++) {
    for (let y = 0; y < PLOT_SIZE; y++) {
      const key = `${x},${y}`;
      if (RESERVED_CELLS.has(key)) continue;

      const dx = x - CENTER_X;
      const dy = y - CENTER_Y;
      cells.push({
        x,
        y,
        isFeatureSlot: FEATURE_SLOT_CELLS.has(key),
        distanceFromCenter: Math.max(Math.abs(dx), Math.abs(dy)),
        angleFromCenter: Math.atan2(dy, dx),
      });
    }
  }
  return cells;
}
