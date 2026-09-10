import { describe, expect, it } from "vitest";
import { computeBackfillRange } from "./range";

describe("computeBackfillRange", () => {
  it("backfills from the day after signup through yesterday on first run", () => {
    expect(computeBackfillRange(null, "2026-09-11", "2026-09-08")).toEqual({
      from: "2026-09-08",
      to: "2026-09-10",
    });
  });

  it("returns null when there is no habit history to backfill from", () => {
    expect(computeBackfillRange(null, "2026-09-11", null)).toBeNull();
  });

  it("backfills only the gap since the last stored rollup", () => {
    expect(computeBackfillRange("2026-09-05", "2026-09-11", "2026-08-01")).toEqual({
      from: "2026-09-06",
      to: "2026-09-10",
    });
  });

  it("is a no-op when already current through yesterday", () => {
    expect(computeBackfillRange("2026-09-10", "2026-09-11", "2026-08-01")).toBeNull();
  });

  it("is a no-op when the last rollup is somehow ahead of yesterday", () => {
    // e.g. the user changed timezone and the new "today" is earlier than
    // the old one — never re-touch already-written days or backfill a
    // negative range.
    expect(computeBackfillRange("2026-09-15", "2026-09-11", "2026-08-01")).toBeNull();
  });

  it("crosses a month/year boundary correctly", () => {
    expect(computeBackfillRange("2025-12-30", "2026-01-02", "2025-01-01")).toEqual({
      from: "2025-12-31",
      to: "2026-01-01",
    });
  });
});
