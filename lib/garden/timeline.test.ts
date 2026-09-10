import { describe, expect, it } from "vitest";
import { buildPointsTimeline } from "./timeline";

describe("buildPointsTimeline", () => {
  it("accumulates pointsEarned into a running cumulative total", () => {
    const timeline = buildPointsTimeline([
      { localDate: "2026-01-01", pointsEarned: 10 },
      { localDate: "2026-01-02", pointsEarned: 15 },
      { localDate: "2026-01-03", pointsEarned: 0 },
      { localDate: "2026-01-04", pointsEarned: 8 },
    ]);

    expect(timeline).toEqual([
      { localDate: "2026-01-01", cumulativePoints: 10 },
      { localDate: "2026-01-02", cumulativePoints: 25 },
      { localDate: "2026-01-03", cumulativePoints: 25 },
      { localDate: "2026-01-04", cumulativePoints: 33 },
    ]);
  });

  it("returns an empty timeline for no rows", () => {
    expect(buildPointsTimeline([])).toEqual([]);
  });
});
