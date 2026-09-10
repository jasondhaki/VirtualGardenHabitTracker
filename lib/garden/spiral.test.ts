import { describe, expect, it } from "vitest";
import { spiralOrder } from "./spiral";

describe("spiralOrder", () => {
  it("produces an identical order for the same seed, always", () => {
    expect(spiralOrder(42)).toEqual(spiralOrder(42));
  });

  it("produces a different order for a different seed", () => {
    expect(spiralOrder(1)).not.toEqual(spiralOrder(2));
  });

  it("covers every plantable cell exactly once with placementOrder 1..32", () => {
    const order = spiralOrder(7);
    expect(order).toHaveLength(32);
    expect(order.map((tile) => tile.placementOrder).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 32 }, (_, i) => i + 1)
    );

    const keys = order.map((tile) => `${tile.x},${tile.y}`);
    expect(new Set(keys).size).toBe(32);
  });

  it("radiates outward: distance from center never decreases as placementOrder increases", () => {
    const order = [...spiralOrder(99)].sort((a, b) => a.placementOrder - b.placementOrder);
    for (let i = 1; i < order.length; i++) {
      expect(order[i].distanceFromCenter).toBeGreaterThanOrEqual(order[i - 1].distanceFromCenter);
    }
  });

  it("marks exactly 5 tiles as feature slots, matching the grid", () => {
    expect(spiralOrder(3).filter((tile) => tile.isFeatureSlot)).toHaveLength(5);
  });
});
