import { describe, expect, it } from "vitest";
import { GRACE_DAYS_PER_MONTH, initialStreakState, stepStreak, type StreakState } from "./streaks";

function run(days: Array<{ date: string; scheduled: number; ratio: number }>) {
  let state = initialStreakState();
  const results: Array<{ streakLength: number; gracedDay: boolean }> = [];
  for (const day of days) {
    const step = stepStreak(state, day.date, day.scheduled, day.ratio);
    state = step.nextState;
    results.push({ streakLength: step.streakLength, gracedDay: step.gracedDay });
  }
  return { results, finalState: state };
}

describe("stepStreak — unscheduled days", () => {
  it("does not break a Mon/Wed/Fri streak on Tuesday", () => {
    // Mon success, Tue nothing scheduled, Wed success — streak must read 1, 1, 2.
    const { results } = run([
      { date: "2026-09-07", scheduled: 1, ratio: 1 }, // Mon
      { date: "2026-09-08", scheduled: 0, ratio: 0 }, // Tue — nothing due
      { date: "2026-09-09", scheduled: 1, ratio: 1 }, // Wed
    ]);
    expect(results.map((r) => r.streakLength)).toEqual([1, 1, 2]);
    expect(results.every((r) => !r.gracedDay)).toBe(true);
  });
});

describe("stepStreak — success and failure", () => {
  it("increments on a day that clears the ratio threshold", () => {
    const { results } = run([{ date: "2026-09-07", scheduled: 2, ratio: 0.6 }]);
    expect(results[0]).toEqual({ streakLength: 1, gracedDay: false });
  });

  it("resets to zero on a missed day once grace days are exhausted", () => {
    const exhausted: StreakState = { streakLength: 5, gracesUsedThisMonth: GRACE_DAYS_PER_MONTH, monthKey: "2026-09" };
    const step = stepStreak(exhausted, "2026-09-15", 1, 0);
    expect(step).toEqual({
      streakLength: 0,
      gracedDay: false,
      nextState: { streakLength: 0, gracesUsedThisMonth: GRACE_DAYS_PER_MONTH, monthKey: "2026-09" },
    });
  });
});

describe("stepStreak — grace days", () => {
  it("consumes a grace day to preserve (not extend) the streak on a miss", () => {
    const { results } = run([
      { date: "2026-09-01", scheduled: 1, ratio: 1 },
      { date: "2026-09-02", scheduled: 1, ratio: 1 },
      { date: "2026-09-03", scheduled: 1, ratio: 0 }, // graced
      { date: "2026-09-04", scheduled: 1, ratio: 1 }, // continues from the pre-miss count
    ]);
    expect(results.map((r) => r.streakLength)).toEqual([1, 2, 2, 3]);
    expect(results[2].gracedDay).toBe(true);
  });

  it(`grants exactly ${GRACE_DAYS_PER_MONTH} grace days per calendar month`, () => {
    const { results } = run([
      { date: "2026-09-01", scheduled: 1, ratio: 1 },
      { date: "2026-09-02", scheduled: 1, ratio: 0 }, // grace 1
      { date: "2026-09-03", scheduled: 1, ratio: 0 }, // grace 2
      { date: "2026-09-04", scheduled: 1, ratio: 0 }, // grace exhausted — resets
    ]);
    expect(results.map((r) => r.gracedDay)).toEqual([false, true, true, false]);
    expect(results[3].streakLength).toBe(0);
  });

  it("resets the grace budget on a new calendar month", () => {
    const { results } = run([
      { date: "2026-09-29", scheduled: 1, ratio: 0 }, // grace 1 (Sept)
      { date: "2026-09-30", scheduled: 1, ratio: 0 }, // grace 2 (Sept)
      { date: "2026-10-01", scheduled: 1, ratio: 0 }, // October — fresh budget, graced again
    ]);
    expect(results.map((r) => r.gracedDay)).toEqual([true, true, true]);
  });

  it("resumes correctly from a persisted state mid-month", () => {
    const resumed: StreakState = { streakLength: 4, gracesUsedThisMonth: 2, monthKey: "2026-09" };
    const step = stepStreak(resumed, "2026-09-15", 1, 0);
    expect(step).toEqual({
      streakLength: 0,
      gracedDay: false,
      nextState: { streakLength: 0, gracesUsedThisMonth: 2, monthKey: "2026-09" },
    });
  });
});
