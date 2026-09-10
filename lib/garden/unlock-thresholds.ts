/**
 * Tile and plot unlock thresholds (build plan §4.2, §4.3). Plot 1 is free —
 * a new user starts able to fill it from zero. Each later plot layers its
 * own budget on top of the cumulative cost of every plot before it, and
 * only stretches *that* plot's 32 tiles across *that* plot's budget — it
 * never touches the curve for tiles already unlocked in an earlier plot.
 */

export const PLOT_TILE_COUNT = 32;
const TILE_UNLOCK_EXPONENT = 1.6;

// Additional points required to fully fill each plot, on top of every plot
// before it (build plan §4.3). Beyond the plots explicitly designed, later
// plots reuse the last defined budget rather than extrapolating a curve
// nobody specified.
const PLOT_BUDGETS = [450, 900, 1350] as const;

function plotBudget(plotIndex: number): number {
  return PLOT_BUDGETS[Math.min(plotIndex - 1, PLOT_BUDGETS.length - 1)];
}

/** Cumulative points required before this plot's own tiles start unlocking. */
export function plotStartingPoints(plotIndex: number): number {
  let total = 0;
  for (let i = 1; i < plotIndex; i++) total += plotBudget(i);
  return total;
}

/**
 * Absolute cumulative points required to unlock the tile at `placementOrder`
 * (1-based) within `plotIndex`. Front-loaded via the `^1.6` exponent so the
 * first session unlocks two or three tiles, not one.
 */
export function tileUnlockPoints(plotIndex: number, placementOrder: number): number {
  const withinPlot = Math.round(plotBudget(plotIndex) * Math.pow(placementOrder / PLOT_TILE_COUNT, TILE_UNLOCK_EXPONENT));
  return plotStartingPoints(plotIndex) + withinPlot;
}
