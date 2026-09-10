import { describe, expect, it } from "vitest";
import { computeDayRollup, computeRollupRange, type RollupCompletionInput, type RollupHabitInput } from "./compute";
import { initialStreakState } from "@/lib/growth/streaks";

const dailyHabit = (overrides: Partial<RollupHabitInput> = {}): RollupHabitInput => ({
  id: "habit-1",
  scheduleMask: 127, // every day
  targetPerDay: 1,
  createdLocalDate: "2026-01-01",
  archivedLocalDate: null,
  ...overrides,
});

function completion(habitId: string, localDate: string, count = 1): RollupCompletionInput {
  return { habitId, localDate, count };
}

describe("computeDayRollup", () => {
  it("scores a fully completed day at ratio 1", () => {
    const { row } = computeDayRollup("2026-09-07", [dailyHabit()], [completion("habit-1", "2026-09-07")], initialStreakState());
    expect(row).toMatchObject({ scheduled: 1, completed: 1, ratio: 1, streakLength: 1, gracedDay: false });
    expect(row.pointsEarned).toBeGreaterThan(0);
  });

  it("gives partial credit for a counter habit below target", () => {
    const habit = dailyHabit({ targetPerDay: 4 });
    const { row } = computeDayRollup("2026-09-07", [habit], [completion("habit-1", "2026-09-07", 2)], initialStreakState());
    expect(row.ratio).toBe(0.5);
    expect(row.completed).toBe(0); // hasn't hit its full target
  });

  it("caps fractional credit at 1.0 even if count overshoots the target", () => {
    const habit = dailyHabit({ targetPerDay: 2 });
    const { row } = computeDayRollup("2026-09-07", [habit], [completion("habit-1", "2026-09-07", 9)], initialStreakState());
    expect(row.ratio).toBe(1);
  });

  it("reports scheduled: 0 and no points on a day nothing is due", () => {
    const monWedFri = dailyHabit({ scheduleMask: 1 + 4 + 16 }); // Mon/Wed/Fri
    const { row } = computeDayRollup("2026-09-08", [monWedFri], [], initialStreakState()); // Tuesday
    expect(row).toMatchObject({ scheduled: 0, completed: 0, ratio: 0, pointsEarned: 0, streakLength: 0 });
  });

  it("excludes a habit before its creation date", () => {
    const habit = dailyHabit({ createdLocalDate: "2026-09-10" });
    const { row } = computeDayRollup("2026-09-07", [habit], [], initialStreakState());
    expect(row.scheduled).toBe(0);
  });

  it("excludes a habit on and after its archive date", () => {
    const habit = dailyHabit({ archivedLocalDate: "2026-09-10" });
    const before = computeDayRollup("2026-09-09", [habit], [completion("habit-1", "2026-09-09")], initialStreakState());
    const onDay = computeDayRollup("2026-09-10", [habit], [], before.nextState);
    expect(before.row.scheduled).toBe(1);
    expect(onDay.row.scheduled).toBe(0);
  });
});

describe("computeRollupRange", () => {
  it("does not break a Mon/Wed/Fri streak on Tuesday across a full week", () => {
    const habit = dailyHabit({ scheduleMask: 1 + 4 + 16 });
    const completions = ["2026-09-07", "2026-09-09", "2026-09-11"].map((date) => completion("habit-1", date));
    const rows = computeRollupRange("2026-09-07", "2026-09-13", [habit], completions);
    const byDate = new Map(rows.map((row) => [row.localDate, row]));
    expect(byDate.get("2026-09-07")!.streakLength).toBe(1); // Mon
    expect(byDate.get("2026-09-08")!.streakLength).toBe(1); // Tue, carried
    expect(byDate.get("2026-09-09")!.streakLength).toBe(2); // Wed
    expect(byDate.get("2026-09-11")!.streakLength).toBe(3); // Fri
    expect(byDate.get("2026-09-13")!.streakLength).toBe(3); // Sun, carried
  });

  it("crosses a month and year boundary without losing the streak", () => {
    const habit = dailyHabit({ createdLocalDate: "2025-01-01" });
    const completions = ["2025-12-30", "2025-12-31", "2026-01-01"].map((date) => completion("habit-1", date));
    const rows = computeRollupRange("2025-12-30", "2026-01-01", [habit], completions);
    expect(rows.map((row) => row.streakLength)).toEqual([1, 2, 3]);
  });

  it("archiving mid-streak stops counting the habit without retroactively breaking prior days", () => {
    const habit = dailyHabit({ archivedLocalDate: "2026-09-10" });
    const completions = ["2026-09-07", "2026-09-08", "2026-09-09"].map((date) => completion("habit-1", date));
    const rows = computeRollupRange("2026-09-07", "2026-09-11", [habit], completions);
    const byDate = new Map(rows.map((row) => [row.localDate, row]));
    expect(byDate.get("2026-09-09")!.streakLength).toBe(3);
    // once archived, the day is simply not scheduled — streak carries flat, doesn't reset
    expect(byDate.get("2026-09-10")!.scheduled).toBe(0);
    expect(byDate.get("2026-09-10")!.streakLength).toBe(3);
    expect(byDate.get("2026-09-11")!.streakLength).toBe(3);
  });

  it("a full from-scratch recompute matches an incremental resume for the same range", () => {
    const habit = dailyHabit();
    const completions = [
      completion("habit-1", "2026-09-01"),
      completion("habit-1", "2026-09-02"),
      completion("habit-1", "2026-09-03", 0),
      completion("habit-1", "2026-09-04"),
      completion("habit-1", "2026-09-05"),
    ].filter((c) => c.count !== 0); // day 3 is simply missing, not a zero-count row

    const fullRun = computeRollupRange("2026-09-01", "2026-09-05", [habit], completions);

    const firstHalf = computeRollupRange("2026-09-01", "2026-09-02", [habit], completions);
    const resumedState = { streakLength: firstHalf.at(-1)!.streakLength, gracesUsedThisMonth: 0, monthKey: "2026-09" };
    const secondHalf = computeRollupRange("2026-09-03", "2026-09-05", [habit], completions, resumedState);

    expect([...firstHalf, ...secondHalf]).toEqual(fullRun);
  });

  it("consumes grace days across a range and resets the budget the following month", () => {
    const habit = dailyHabit();
    // two misses in September (both graced), one more miss in September (breaks),
    // then a miss on October 1st (fresh budget, graced again).
    const completions = ["2026-09-01", "2026-09-04", "2026-10-02"].map((date) => completion("habit-1", date));
    const rows = computeRollupRange("2026-09-01", "2026-10-02", [habit], completions);
    const byDate = new Map(rows.map((row) => [row.localDate, row]));

    expect(byDate.get("2026-09-02")!.gracedDay).toBe(true); // grace 1
    expect(byDate.get("2026-09-03")!.gracedDay).toBe(true); // grace 2
    expect(byDate.get("2026-09-05")!.gracedDay).toBe(false); // exhausted, streak resets
    expect(byDate.get("2026-09-05")!.streakLength).toBe(0);
    expect(byDate.get("2026-10-01")!.gracedDay).toBe(true); // new month, fresh budget
  });
});
