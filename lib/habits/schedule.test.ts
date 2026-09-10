import { describe, expect, it } from "vitest";
import {
  EVERY_DAY_MASK,
  dayKeysFromMask,
  isScheduledOn,
  maskFromDayKeys,
  scheduleBitForLocalDate,
} from "./schedule";

describe("maskFromDayKeys / dayKeysFromMask", () => {
  it("round-trips a Mon/Wed/Fri schedule", () => {
    const mask = maskFromDayKeys(["mon", "wed", "fri"]);
    expect(mask).toBe(1 + 4 + 16);
    expect(dayKeysFromMask(mask)).toEqual(["mon", "wed", "fri"]);
  });

  it("every-day mask covers all seven bits", () => {
    expect(EVERY_DAY_MASK).toBe(127);
  });

  it("ignores unknown keys", () => {
    expect(maskFromDayKeys(["mon", "bogus"])).toBe(1);
  });
});

describe("scheduleBitForLocalDate", () => {
  it("maps known calendar dates to the right bit", () => {
    // 2026-09-07 is a Monday, 2026-09-08 a Tuesday, 2026-09-13 a Sunday.
    expect(scheduleBitForLocalDate("2026-09-07")).toBe(1); // Mon
    expect(scheduleBitForLocalDate("2026-09-08")).toBe(2); // Tue
    expect(scheduleBitForLocalDate("2026-09-13")).toBe(64); // Sun
  });
});

describe("isScheduledOn", () => {
  const monWedFri = maskFromDayKeys(["mon", "wed", "fri"]);

  it("is due on scheduled days", () => {
    expect(isScheduledOn(monWedFri, "2026-09-07")).toBe(true); // Mon
    expect(isScheduledOn(monWedFri, "2026-09-09")).toBe(true); // Wed
    expect(isScheduledOn(monWedFri, "2026-09-11")).toBe(true); // Fri
  });

  it("does not break on Tuesday for a Mon/Wed/Fri habit", () => {
    expect(isScheduledOn(monWedFri, "2026-09-08")).toBe(false); // Tue
  });

  it("is due every day under the every-day mask", () => {
    for (const date of ["2026-09-07", "2026-09-08", "2026-09-13"]) {
      expect(isScheduledOn(EVERY_DAY_MASK, date)).toBe(true);
    }
  });
});
