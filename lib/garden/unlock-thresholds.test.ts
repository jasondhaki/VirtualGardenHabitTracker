import { describe, expect, it } from "vitest";
import { plotStartingPoints, tileUnlockPoints } from "./unlock-thresholds";

describe("tileUnlockPoints", () => {
  it("unlocks plot 1's last tile at exactly 450 points (build plan §3.1)", () => {
    expect(tileUnlockPoints(1, 32)).toBe(450);
  });

  it("is strictly increasing across a plot's 32 tiles", () => {
    const thresholds = Array.from({ length: 32 }, (_, i) => tileUnlockPoints(1, i + 1));
    for (let i = 1; i < thresholds.length; i++) {
      expect(thresholds[i]).toBeGreaterThan(thresholds[i - 1]);
    }
  });

  it("is front-loaded: the first tile costs far less than 1/32 of the budget", () => {
    expect(tileUnlockPoints(1, 1)).toBeLessThan(450 / 32);
  });

  it("matches build plan §4.2: 115 points unlocks 13 tiles, not 14", () => {
    expect(tileUnlockPoints(1, 13)).toBeLessThanOrEqual(115);
    expect(tileUnlockPoints(1, 14)).toBeGreaterThan(115);
  });

  it("plot 2 continues from plot 1's total rather than restarting at 0", () => {
    expect(plotStartingPoints(2)).toBe(450);
    expect(tileUnlockPoints(2, 1)).toBeGreaterThan(plotStartingPoints(2));
  });

  it("plot budgets stack per build plan §4.3 (450, +900, +1350)", () => {
    expect(plotStartingPoints(1)).toBe(0);
    expect(plotStartingPoints(2)).toBe(450);
    expect(plotStartingPoints(3)).toBe(1350);
    expect(plotStartingPoints(4)).toBe(2700);
  });
});
