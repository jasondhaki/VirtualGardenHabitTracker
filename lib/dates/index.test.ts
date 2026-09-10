import { describe, expect, it } from "vitest";
import { addDaysToLocalDate, compareLocalDates, formatDbDate, localSeason, toDbDate, todayLocalDate } from "./index";

describe("todayLocalDate", () => {
  it("resolves the same instant to different calendar dates in different timezones (date-line crossing)", () => {
    const instant = new Date("2026-09-11T23:00:00.000Z");
    expect(todayLocalDate("Pacific/Kiritimati", instant)).toBe("2026-09-12"); // UTC+14
    expect(todayLocalDate("Pacific/Niue", instant)).toBe("2026-09-11"); // UTC-11
  });

  it("does not shift across a DST spring-forward transition", () => {
    // America/New_York springs forward on 2026-03-08 at 2am local.
    const beforeTransition = new Date("2026-03-08T04:00:00.000Z"); // 11pm EST the night before
    const afterTransition = new Date("2026-03-08T15:00:00.000Z"); // 11am EDT that day
    expect(todayLocalDate("America/New_York", beforeTransition)).toBe("2026-03-07");
    expect(todayLocalDate("America/New_York", afterTransition)).toBe("2026-03-08");
  });

  it("does not shift across a DST fall-back transition", () => {
    // America/New_York falls back on 2026-11-01 at 2am local.
    const midnightLocal = new Date("2026-11-01T04:00:00.000Z"); // midnight EDT
    const lateMorningLocal = new Date("2026-11-01T16:00:00.000Z"); // 11am EST, after fall-back
    expect(todayLocalDate("America/New_York", midnightLocal)).toBe("2026-11-01");
    expect(todayLocalDate("America/New_York", lateMorningLocal)).toBe("2026-11-01");
  });
});

describe("formatDbDate / toDbDate round-trip", () => {
  it("round-trips a bare date through UTC midnight without shifting, regardless of viewer timezone", () => {
    // A `@db.Date` column hydrates as a JS Date at UTC midnight — this must
    // always format back to the same calendar date (CLAUDE.md Prisma nuance).
    const dbDate = toDbDate("2026-09-11");
    expect(formatDbDate(dbDate)).toBe("2026-09-11");
  });

  it("round-trips correctly across a year boundary", () => {
    expect(formatDbDate(toDbDate("2025-12-31"))).toBe("2025-12-31");
    expect(formatDbDate(toDbDate("2026-01-01"))).toBe("2026-01-01");
  });
});

describe("addDaysToLocalDate", () => {
  it("crosses a month boundary", () => {
    expect(addDaysToLocalDate("2026-01-31", 1)).toBe("2026-02-01");
  });

  it("crosses a year boundary", () => {
    expect(addDaysToLocalDate("2025-12-31", 1)).toBe("2026-01-01");
  });

  it("handles a leap-year February correctly", () => {
    expect(addDaysToLocalDate("2028-02-28", 1)).toBe("2028-02-29"); // 2028 is a leap year
    expect(addDaysToLocalDate("2028-02-29", 1)).toBe("2028-03-01");
  });

  it("handles a non-leap-year February correctly", () => {
    expect(addDaysToLocalDate("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("is unaffected by DST transitions since it operates on bare dates, not wall-clock time", () => {
    expect(addDaysToLocalDate("2026-03-07", 1)).toBe("2026-03-08"); // spans US spring-forward
    expect(addDaysToLocalDate("2026-11-01", 1)).toBe("2026-11-02"); // spans US fall-back
  });

  it("supports negative offsets", () => {
    expect(addDaysToLocalDate("2026-01-01", -1)).toBe("2025-12-31");
  });
});

describe("compareLocalDates", () => {
  it("orders dates lexicographically, which matches calendar order for yyyy-MM-dd strings", () => {
    expect(compareLocalDates("2026-01-01", "2025-12-31")).toBeGreaterThan(0);
    expect(compareLocalDates("2026-01-01", "2026-01-01")).toBe(0);
    expect(compareLocalDates("2026-01-01", "2026-01-02")).toBeLessThan(0);
  });
});

describe("localSeason", () => {
  it("classifies every month into its meteorological season", () => {
    expect(localSeason("2026-01-15")).toBe("winter");
    expect(localSeason("2026-02-15")).toBe("winter");
    expect(localSeason("2026-03-15")).toBe("spring");
    expect(localSeason("2026-05-15")).toBe("spring");
    expect(localSeason("2026-06-15")).toBe("summer");
    expect(localSeason("2026-08-15")).toBe("summer");
    expect(localSeason("2026-09-15")).toBe("fall");
    expect(localSeason("2026-11-15")).toBe("fall");
    expect(localSeason("2026-12-15")).toBe("winter");
  });

  it("puts December in winter alongside January/February, not treated as month 0", () => {
    expect(localSeason("2026-12-31")).toBe("winter");
  });
});
