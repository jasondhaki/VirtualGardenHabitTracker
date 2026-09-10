import { describe, expect, it } from "vitest";
import {
  evaluateAchievements,
  type AchievementCompletionInput,
  type AchievementHabitInput,
  type AchievementRollupInput,
} from "./evaluate";

function keys(earned: { achievementKey: string }[]): string[] {
  return earned.map((e) => e.achievementKey).sort();
}

describe("evaluateAchievements — first_sprout", () => {
  it("earns on the date of the very first completion, across any habit", () => {
    const completions: AchievementCompletionInput[] = [
      { habitId: "b", localDate: "2026-02-05", localHour: 10 },
      { habitId: "a", localDate: "2026-02-01", localHour: 9 },
    ];
    const earned = evaluateAchievements({ rollups: [], completions, habits: [] });
    expect(earned).toContainEqual({ achievementKey: "first_sprout", earnedOnDate: "2026-02-01" });
  });

  it("does not earn with no completions at all", () => {
    const earned = evaluateAchievements({ rollups: [], completions: [], habits: [] });
    expect(keys(earned)).not.toContain("first_sprout");
  });
});

describe("evaluateAchievements — perfect_week", () => {
  it("earns on the 7th consecutive 100% day", () => {
    const rollups: AchievementRollupInput[] = Array.from({ length: 7 }, (_, i) => ({
      localDate: `2026-03-0${i + 1}`,
      scheduled: 1,
      ratio: 1,
      streakLength: i + 1,
    }));
    const earned = evaluateAchievements({ rollups, completions: [], habits: [] });
    expect(earned).toContainEqual({ achievementKey: "perfect_week", earnedOnDate: "2026-03-07" });
  });

  it("does not break the run on an unscheduled day (Tuesday case)", () => {
    const rollups: AchievementRollupInput[] = [
      { localDate: "2026-03-02", scheduled: 1, ratio: 1, streakLength: 1 }, // Mon
      { localDate: "2026-03-03", scheduled: 0, ratio: 0, streakLength: 1 }, // Tue — nothing due
      { localDate: "2026-03-04", scheduled: 1, ratio: 1, streakLength: 2 },
      { localDate: "2026-03-05", scheduled: 1, ratio: 1, streakLength: 3 },
      { localDate: "2026-03-06", scheduled: 1, ratio: 1, streakLength: 4 },
      { localDate: "2026-03-07", scheduled: 1, ratio: 1, streakLength: 5 },
      { localDate: "2026-03-08", scheduled: 1, ratio: 1, streakLength: 6 },
      { localDate: "2026-03-09", scheduled: 1, ratio: 1, streakLength: 7 },
    ];
    const earned = evaluateAchievements({ rollups, completions: [], habits: [] });
    expect(earned).toContainEqual({ achievementKey: "perfect_week", earnedOnDate: "2026-03-09" });
  });

  it("resets on a day under 100%", () => {
    const rollups: AchievementRollupInput[] = [
      ...Array.from({ length: 6 }, (_, i) => ({ localDate: `2026-03-0${i + 1}`, scheduled: 1, ratio: 1, streakLength: i + 1 })),
      { localDate: "2026-03-07", scheduled: 1, ratio: 0.5, streakLength: 0 },
    ];
    const earned = evaluateAchievements({ rollups, completions: [], habits: [] });
    expect(keys(earned)).not.toContain("perfect_week");
  });
});

describe("evaluateAchievements — fortnight and steadfast", () => {
  it("earns fortnight the day streakLength first reaches 14", () => {
    const rollups: AchievementRollupInput[] = [
      { localDate: "2026-01-13", scheduled: 1, ratio: 1, streakLength: 13 },
      { localDate: "2026-01-14", scheduled: 1, ratio: 1, streakLength: 14 },
    ];
    const earned = evaluateAchievements({ rollups, completions: [], habits: [] });
    expect(earned).toContainEqual({ achievementKey: "fortnight", earnedOnDate: "2026-01-14" });
    expect(keys(earned)).not.toContain("steadfast");
  });

  it("earns steadfast the day streakLength first reaches 30", () => {
    const rollups: AchievementRollupInput[] = [
      { localDate: "2026-01-29", scheduled: 1, ratio: 1, streakLength: 29 },
      { localDate: "2026-01-30", scheduled: 1, ratio: 1, streakLength: 30 },
    ];
    const earned = evaluateAchievements({ rollups, completions: [], habits: [] });
    expect(earned).toContainEqual({ achievementKey: "steadfast", earnedOnDate: "2026-01-30" });
  });
});

describe("evaluateAchievements — comeback", () => {
  it("requires a real 7+ day gap before a rebuilt 7-day streak counts", () => {
    const gap = Array.from({ length: 7 }, (_, i) => ({
      localDate: `2026-04-0${i + 1}`,
      scheduled: 1,
      ratio: 0,
      streakLength: 0,
    }));
    const rebuild = Array.from({ length: 7 }, (_, i) => ({
      localDate: `2026-04-${String(i + 8).padStart(2, "0")}`,
      scheduled: 1,
      ratio: 1,
      streakLength: i + 1,
    }));
    const earned = evaluateAchievements({ rollups: [...gap, ...rebuild], completions: [], habits: [] });
    expect(earned).toContainEqual({ achievementKey: "comeback", earnedOnDate: "2026-04-14" });
  });

  it("does not earn a plain 7-day streak with no prior gap", () => {
    const rollups: AchievementRollupInput[] = Array.from({ length: 7 }, (_, i) => ({
      localDate: `2026-04-0${i + 1}`,
      scheduled: 1,
      ratio: 1,
      streakLength: i + 1,
    }));
    const earned = evaluateAchievements({ rollups, completions: [], habits: [] });
    expect(keys(earned)).not.toContain("comeback");
  });

  it("does not earn from a gap shorter than 7 days", () => {
    const shortGap = Array.from({ length: 6 }, (_, i) => ({
      localDate: `2026-04-0${i + 1}`,
      scheduled: 1,
      ratio: 0,
      streakLength: 0,
    }));
    const rebuild = Array.from({ length: 7 }, (_, i) => ({
      localDate: `2026-04-${String(i + 7).padStart(2, "0")}`,
      scheduled: 1,
      ratio: 1,
      streakLength: i + 1,
    }));
    const earned = evaluateAchievements({ rollups: [...shortGap, ...rebuild], completions: [], habits: [] });
    expect(keys(earned)).not.toContain("comeback");
  });
});

describe("evaluateAchievements — early_riser", () => {
  it("earns on the date of the 20th sub-8am completion", () => {
    const completions: AchievementCompletionInput[] = Array.from({ length: 20 }, (_, i) => ({
      habitId: "a",
      localDate: `2026-05-${String(i + 1).padStart(2, "0")}`,
      localHour: 7,
    }));
    const earned = evaluateAchievements({ rollups: [], completions, habits: [] });
    expect(earned).toContainEqual({ achievementKey: "early_riser", earnedOnDate: "2026-05-20" });
  });

  it("ignores completions at or after 8am", () => {
    const completions: AchievementCompletionInput[] = Array.from({ length: 20 }, (_, i) => ({
      habitId: "a",
      localDate: `2026-05-${String(i + 1).padStart(2, "0")}`,
      localHour: 8,
    }));
    const earned = evaluateAchievements({ rollups: [], completions, habits: [] });
    expect(keys(earned)).not.toContain("early_riser");
  });
});

describe("evaluateAchievements — four_seasons", () => {
  it("earns on the date the 4th distinct season is first touched", () => {
    const completions: AchievementCompletionInput[] = [
      { habitId: "a", localDate: "2026-01-15", localHour: 10 }, // winter
      { habitId: "a", localDate: "2026-04-15", localHour: 10 }, // spring
      { habitId: "a", localDate: "2026-07-15", localHour: 10 }, // summer
      { habitId: "a", localDate: "2026-10-15", localHour: 10 }, // fall
    ];
    const earned = evaluateAchievements({ rollups: [], completions, habits: [] });
    expect(earned).toContainEqual({ achievementKey: "four_seasons", earnedOnDate: "2026-10-15" });
  });

  it("does not earn from three seasons alone", () => {
    const completions: AchievementCompletionInput[] = [
      { habitId: "a", localDate: "2026-01-15", localHour: 10 },
      { habitId: "a", localDate: "2026-04-15", localHour: 10 },
      { habitId: "a", localDate: "2026-07-15", localHour: 10 },
    ];
    const earned = evaluateAchievements({ rollups: [], completions, habits: [] });
    expect(keys(earned)).not.toContain("four_seasons");
  });
});

describe("evaluateAchievements — polyculture", () => {
  function habit(id: string, createdLocalDate: string): AchievementHabitInput {
    return { id, scheduleMask: 127, createdLocalDate, archivedLocalDate: null }; // every day
  }

  it("earns once 5 active habits all clear 80% over the trailing 30 days", () => {
    const habits = ["a", "b", "c", "d", "e"].map((id) => habit(id, "2026-01-01"));
    const completions: AchievementCompletionInput[] = [];
    const rollups: AchievementRollupInput[] = [];

    for (let day = 1; day <= 30; day++) {
      const date = `2026-01-${String(day).padStart(2, "0")}`;
      rollups.push({ localDate: date, scheduled: 5, ratio: 1, streakLength: day });
      for (const h of habits) completions.push({ habitId: h.id, localDate: date, localHour: 10 });
    }

    const earned = evaluateAchievements({ rollups, completions, habits });
    expect(keys(earned)).toContain("polyculture");
  });

  it("does not earn with only 4 active habits", () => {
    const habits = ["a", "b", "c", "d"].map((id) => habit(id, "2026-01-01"));
    const completions: AchievementCompletionInput[] = [];
    const rollups: AchievementRollupInput[] = [];

    for (let day = 1; day <= 30; day++) {
      const date = `2026-01-${String(day).padStart(2, "0")}`;
      rollups.push({ localDate: date, scheduled: 4, ratio: 1, streakLength: day });
      for (const h of habits) completions.push({ habitId: h.id, localDate: date, localHour: 10 });
    }

    const earned = evaluateAchievements({ rollups, completions, habits });
    expect(keys(earned)).not.toContain("polyculture");
  });

  it("does not earn when one of the 5 habits falls under 80%", () => {
    const habits = ["a", "b", "c", "d", "e"].map((id) => habit(id, "2026-01-01"));
    const completions: AchievementCompletionInput[] = [];
    const rollups: AchievementRollupInput[] = [];

    for (let day = 1; day <= 30; day++) {
      const date = `2026-01-${String(day).padStart(2, "0")}`;
      rollups.push({ localDate: date, scheduled: 5, ratio: 1, streakLength: day });
      for (const h of habits) {
        if (h.id === "e" && day % 2 === 0) continue; // habit e only 50%
        completions.push({ habitId: h.id, localDate: date, localHour: 10 });
      }
    }

    const earned = evaluateAchievements({ rollups, completions, habits });
    expect(keys(earned)).not.toContain("polyculture");
  });
});
