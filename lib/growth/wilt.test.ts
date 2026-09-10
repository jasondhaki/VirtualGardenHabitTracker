import { describe, expect, it } from "vitest";
import { currentWiltTier, trailingWiltAverage, wiltTierFromAverageRatio } from "./wilt";

describe("wiltTierFromAverageRatio", () => {
  it("maps the boundary ratios from build plan §3.4 to their tiers", () => {
    expect(wiltTierFromAverageRatio(1)).toBe("thriving");
    expect(wiltTierFromAverageRatio(0.8)).toBe("thriving");
    expect(wiltTierFromAverageRatio(0.79)).toBe("healthy");
    expect(wiltTierFromAverageRatio(0.5)).toBe("healthy");
    expect(wiltTierFromAverageRatio(0.49)).toBe("drooping");
    expect(wiltTierFromAverageRatio(0.25)).toBe("drooping");
    expect(wiltTierFromAverageRatio(0.24)).toBe("dormant");
    expect(wiltTierFromAverageRatio(0)).toBe("dormant");
  });
});

describe("trailingWiltAverage — schedule awareness", () => {
  it("skips unscheduled days rather than counting them as 0 (the Tuesday case)", () => {
    const rowsDescending = [
      { scheduled: 0, ratio: 0 }, // today, nothing due — must not drag the average down
      { scheduled: 1, ratio: 1 },
      { scheduled: 1, ratio: 1 },
    ];
    expect(trailingWiltAverage(rowsDescending)).toBe(1);
  });

  it("averages only the most recent 14 scheduled days", () => {
    const oldBadDays = Array.from({ length: 10 }, () => ({ scheduled: 1, ratio: 0 }));
    const recentGoodDays = Array.from({ length: 14 }, () => ({ scheduled: 1, ratio: 1 }));
    expect(trailingWiltAverage([...recentGoodDays, ...oldBadDays])).toBe(1);
  });

  it("gives a brand-new user with no scheduled history the benefit of the doubt", () => {
    expect(trailingWiltAverage([])).toBe(1);
    expect(trailingWiltAverage([{ scheduled: 0, ratio: 0 }])).toBe(1);
  });

  it("recovers immediately once a good day lands, per build plan §3.4", () => {
    const dormantWeek = Array.from({ length: 13 }, () => ({ scheduled: 1, ratio: 0 }));
    const rowsDescending = [{ scheduled: 1, ratio: 1 }, ...dormantWeek];
    // 1 good day out of 14 scheduled days.
    expect(trailingWiltAverage(rowsDescending)).toBeCloseTo(1 / 14, 10);
  });
});

describe("currentWiltTier", () => {
  it("composes the average and the tier boundaries end to end", () => {
    const thriving = Array.from({ length: 14 }, () => ({ scheduled: 1, ratio: 0.9 }));
    const dormant = Array.from({ length: 14 }, () => ({ scheduled: 1, ratio: 0 }));
    expect(currentWiltTier(thriving)).toBe("thriving");
    expect(currentWiltTier(dormant)).toBe("dormant");
  });
});
