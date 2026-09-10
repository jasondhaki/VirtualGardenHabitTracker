import { describe, expect, it } from "vitest";
import { basePointsFromRatio, dailyPoints, streakMultiplier } from "./points";

describe("basePointsFromRatio", () => {
  it("gives partial credit that is more than linear", () => {
    // a 60% day earns 7 points, not 6 (build plan §3.1) — the ^0.7
    // exponent is what makes partial days feel worth finishing.
    expect(basePointsFromRatio(0.6)).toBe(7);
  });

  it("is zero at zero and ten at a perfect day", () => {
    expect(basePointsFromRatio(0)).toBe(0);
    expect(basePointsFromRatio(1)).toBe(10);
  });
});

describe("streakMultiplier", () => {
  it("is 1.0 with no streak", () => {
    expect(streakMultiplier(0)).toBe(1);
  });

  it("caps at day 30 (1.99x) and never grows past it", () => {
    expect(streakMultiplier(30)).toBeCloseTo(1.99, 5);
    expect(streakMultiplier(90)).toBeCloseTo(1.99, 5);
  });
});

describe("dailyPoints", () => {
  it("perfect days over 30 days total to roughly 450 (build plan §3.1)", () => {
    let total = 0;
    for (let streak = 1; streak <= 30; streak++) {
      total += dailyPoints(1, streak);
    }
    expect(total).toBeGreaterThan(430);
    expect(total).toBeLessThan(460);
  });

  it("rounds to an integer even when the intermediate multiplier is fractional", () => {
    const points = dailyPoints(0.6, 5);
    expect(Number.isInteger(points)).toBe(true);
  });

  it("a zero ratio day never earns points regardless of streak", () => {
    expect(dailyPoints(0, 29)).toBe(0);
  });
});
