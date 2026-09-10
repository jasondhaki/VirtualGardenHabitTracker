import { mulberry32 } from "@/lib/prng";
import { deriveSeed } from "@/lib/garden/seed";
import { EVERY_DAY_MASK, maskFromDayKeys } from "@/lib/habits/schedule";

/**
 * Fixed, deterministic 120-day demo scenario (build plan §13.1 — "strong
 * early streaks, a two-week slump, a recovery"). Everything here is
 * offset-indexed from day 0 rather than tied to real calendar dates, so the
 * arc itself is testable in isolation; `lib/demo/build.ts` is the only place
 * that maps offsets onto real `localDate` strings.
 */

export const DEMO_GARDEN_SEED = 4_202_026;
export const DEMO_HISTORY_DAYS = 120;

// Days 0-39 strong, 40-53 a slump (14 days — long enough to break every
// streak and qualify as a "comeback" gap), 54-119 recovery.
export const STRONG_PHASE_END = 40;
export const SLUMP_PHASE_END = 54;

export interface DemoHabit {
  id: string;
  name: string;
  iconKey: string;
  scheduleMask: number;
  targetPerDay: number;
  /** Every demo habit exists from day 0 — nothing is created or archived mid-history. */
  dayOffsetCreated: 0;
  /** Fixed hour this habit tends to get logged — deliberate, not random, so `early_riser` is reachable. */
  localHour: number;
}

const WEEKDAYS = maskFromDayKeys(["mon", "tue", "wed", "thu", "fri"]);
const MON_WED_FRI = maskFromDayKeys(["mon", "wed", "fri"]);
const WEEKEND = maskFromDayKeys(["sat", "sun"]);

export const DEMO_HABITS: DemoHabit[] = [
  { id: "demo-water", name: "Drink water", iconKey: "water", scheduleMask: EVERY_DAY_MASK, targetPerDay: 1, dayOffsetCreated: 0, localHour: 7 },
  { id: "demo-stretch", name: "Morning stretch", iconKey: "sun", scheduleMask: EVERY_DAY_MASK, targetPerDay: 1, dayOffsetCreated: 0, localHour: 6 },
  { id: "demo-read", name: "Read 10 pages", iconKey: "book", scheduleMask: WEEKDAYS, targetPerDay: 1, dayOffsetCreated: 0, localHour: 21 },
  { id: "demo-run", name: "Go for a run", iconKey: "run", scheduleMask: MON_WED_FRI, targetPerDay: 1, dayOffsetCreated: 0, localHour: 18 },
  { id: "demo-journal", name: "Journal", iconKey: "write", scheduleMask: EVERY_DAY_MASK, targetPerDay: 1, dayOffsetCreated: 0, localHour: 22 },
  { id: "demo-tidy", name: "Tidy for 10 minutes", iconKey: "salad", scheduleMask: WEEKEND, targetPerDay: 1, dayOffsetCreated: 0, localHour: 11 },
];

export interface DemoCompletionOffset {
  habitId: string;
  dayOffset: number;
  count: number;
  localHour: number;
}

function completionProbability(dayOffset: number): number {
  if (dayOffset < STRONG_PHASE_END) return 0.92;
  if (dayOffset < SLUMP_PHASE_END) return 0.12;

  // Recovery ramps from a shaky restart up to a steady, near-strong pace.
  const daysIntoRecovery = dayOffset - SLUMP_PHASE_END;
  const ramp = Math.min(daysIntoRecovery / 10, 1);
  return 0.55 + ramp * 0.35;
}

/**
 * One coin flip per habit per scheduled day, weighted by `completionProbability`.
 * Deterministic: every habit gets its own PRNG stream (`deriveSeed` salted by
 * a stable hash of the habit id) so reordering `DEMO_HABITS` never changes
 * another habit's sequence.
 */
export function generateDemoCompletions(): DemoCompletionOffset[] {
  const completions: DemoCompletionOffset[] = [];

  for (const habit of DEMO_HABITS) {
    const salt = [...habit.id].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) | 0, 0);
    const rand = mulberry32(deriveSeed(DEMO_GARDEN_SEED, salt));

    for (let dayOffset = 0; dayOffset < DEMO_HISTORY_DAYS; dayOffset++) {
      const roll = rand();
      if (roll < completionProbability(dayOffset)) {
        completions.push({ habitId: habit.id, dayOffset, count: habit.targetPerDay, localHour: habit.localHour });
      }
    }
  }

  return completions;
}
