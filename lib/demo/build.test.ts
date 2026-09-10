import { describe, expect, it } from "vitest";
import { DEMO_HISTORY_DAYS } from "./scenario";
import { buildDemoGarden } from "./build";

describe("buildDemoGarden", () => {
  it("produces one snapshot per day of history", () => {
    const garden = buildDemoGarden(new Date("2026-06-15T12:00:00Z"));
    expect(garden.snapshots).toHaveLength(DEMO_HISTORY_DAYS);
  });

  it("is deterministic for the same anchor date", () => {
    const now = new Date("2026-06-15T12:00:00Z");
    expect(buildDemoGarden(now)).toEqual(buildDemoGarden(now));
  });

  it("has non-decreasing cumulative points across the whole history", () => {
    const garden = buildDemoGarden(new Date("2026-06-15T12:00:00Z"));
    for (let i = 1; i < garden.snapshots.length; i++) {
      expect(garden.snapshots[i].totalPoints).toBeGreaterThanOrEqual(garden.snapshots[i - 1].totalPoints);
    }
  });

  it("earns a meaningful amount of points by the end of the story", () => {
    const garden = buildDemoGarden(new Date("2026-06-15T12:00:00Z"));
    const last = garden.snapshots[garden.snapshots.length - 1];
    expect(last.totalPoints).toBeGreaterThan(400); // enough to fill most of plot 1
  });

  it("plants at least one tile by the end of the story", () => {
    const garden = buildDemoGarden(new Date("2026-06-15T12:00:00Z"));
    const last = garden.snapshots[garden.snapshots.length - 1];
    const plantedCells = last.plots.flatMap((plot) => plot.cells).filter((cell) => cell.kind === "planted");
    expect(plantedCells.length).toBeGreaterThan(0);
  });

  it("produces every day's local date in ascending order with no gaps", () => {
    const garden = buildDemoGarden(new Date("2026-06-15T12:00:00Z"));
    for (let i = 1; i < garden.snapshots.length; i++) {
      expect(garden.snapshots[i].localDate > garden.snapshots[i - 1].localDate).toBe(true);
    }
  });
});
