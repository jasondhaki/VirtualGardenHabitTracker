import { describe, expect, it } from "vitest";
import { plantableCells, reservedCells } from "./grid";

describe("plantableCells", () => {
  it("returns exactly 32 cells (36 minus the 4 reserved corners)", () => {
    expect(plantableCells()).toHaveLength(32);
  });

  it("marks exactly 5 cells as feature slots", () => {
    expect(plantableCells().filter((cell) => cell.isFeatureSlot)).toHaveLength(5);
  });

  it("never includes a reserved corner", () => {
    const corners = new Set(["0,0", "5,0", "0,5", "5,5"]);
    for (const cell of plantableCells()) {
      expect(corners.has(`${cell.x},${cell.y}`)).toBe(false);
    }
  });

  it("has no duplicate coordinates", () => {
    const keys = plantableCells().map((cell) => `${cell.x},${cell.y}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("reservedCells", () => {
  it("returns exactly the 4 corners excluded from plantableCells", () => {
    expect(new Set(reservedCells().map((c) => `${c.x},${c.y}`))).toEqual(new Set(["0,0", "5,0", "0,5", "5,5"]));
  });
});
