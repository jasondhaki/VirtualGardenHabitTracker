import { describe, expect, it } from "vitest";
import { DEMO_HABITS, DEMO_HISTORY_DAYS, SLUMP_PHASE_END, STRONG_PHASE_END, generateDemoCompletions } from "./scenario";

function rateInRange(from: number, to: number): number {
  const completions = generateDemoCompletions();
  const habitIds = new Set(DEMO_HABITS.map((habit) => habit.id));
  const inRange = completions.filter((completion) => completion.dayOffset >= from && completion.dayOffset < to);
  const possible = habitIds.size * (to - from);
  return inRange.length / possible;
}

describe("generateDemoCompletions", () => {
  it("is deterministic across calls", () => {
    expect(generateDemoCompletions()).toEqual(generateDemoCompletions());
  });

  it("stays within the 120-day history window", () => {
    for (const completion of generateDemoCompletions()) {
      expect(completion.dayOffset).toBeGreaterThanOrEqual(0);
      expect(completion.dayOffset).toBeLessThan(DEMO_HISTORY_DAYS);
    }
  });

  it("completes at a high rate during the strong phase", () => {
    expect(rateInRange(0, STRONG_PHASE_END)).toBeGreaterThan(0.7);
  });

  it("completes at a low rate during the slump", () => {
    expect(rateInRange(STRONG_PHASE_END, SLUMP_PHASE_END)).toBeLessThan(0.3);
  });

  it("recovers to a high rate by the end of the history", () => {
    expect(rateInRange(DEMO_HISTORY_DAYS - 20, DEMO_HISTORY_DAYS)).toBeGreaterThan(0.7);
  });

  it("only ever references known demo habit ids", () => {
    const habitIds = new Set(DEMO_HABITS.map((habit) => habit.id));
    for (const completion of generateDemoCompletions()) {
      expect(habitIds.has(completion.habitId)).toBe(true);
    }
  });
});
