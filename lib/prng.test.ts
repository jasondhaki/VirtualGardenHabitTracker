import { describe, expect, it } from "vitest";
import { mulberry32 } from "./prng";

describe("mulberry32", () => {
  it("produces an identical sequence for the same seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const sequenceA = Array.from({ length: 10 }, () => a());
    const sequenceB = Array.from({ length: 10 }, () => b());
    expect(sequenceA).toEqual(sequenceB);
  });

  it("produces different sequences for different seeds", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const sequenceA = Array.from({ length: 10 }, () => a());
    const sequenceB = Array.from({ length: 10 }, () => b());
    expect(sequenceA).not.toEqual(sequenceB);
  });

  it("stays within [0, 1)", () => {
    const rand = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const value = rand();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
