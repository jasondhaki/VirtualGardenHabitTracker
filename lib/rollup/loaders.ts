import { PrismaClient, Prisma } from "@prisma/client";
import { compareLocalDates, formatDbDate, todayLocalDate, toDbDate } from "@/lib/dates";
import { initialStreakState, type StreakState } from "@/lib/growth/streaks";
import type { RollupCompletionInput, RollupHabitInput } from "./compute";

/**
 * Accepts either the top-level Prisma client or an in-flight `$transaction`
 * client — every read here needs to run inside the same transaction as the
 * completion write when called from the check-off path (CLAUDE.md: "Rollup
 * write path inside the completion transaction").
 */
export type RollupDbClient = PrismaClient | Prisma.TransactionClient;

export async function loadHabitsForRollup(
  client: RollupDbClient,
  userId: string,
  timezone: string
): Promise<RollupHabitInput[]> {
  const habits = await client.habit.findMany({
    where: { userId },
    select: { id: true, scheduleMask: true, targetPerDay: true, createdAt: true, archivedAt: true },
  });

  return habits.map((habit) => ({
    id: habit.id,
    scheduleMask: habit.scheduleMask,
    targetPerDay: habit.targetPerDay,
    createdLocalDate: todayLocalDate(timezone, habit.createdAt),
    archivedLocalDate: habit.archivedAt ? todayLocalDate(timezone, habit.archivedAt) : null,
  }));
}

export async function loadCompletionsForRollup(
  client: RollupDbClient,
  userId: string,
  fromLocalDate: string,
  toLocalDate: string
): Promise<RollupCompletionInput[]> {
  const completions = await client.completion.findMany({
    where: {
      userId,
      localDate: { gte: toDbDate(fromLocalDate), lte: toDbDate(toLocalDate) },
    },
    select: { habitId: true, localDate: true, count: true },
  });

  return completions.map((completion) => ({
    habitId: completion.habitId,
    localDate: formatDbDate(completion.localDate),
    count: completion.count,
  }));
}

export function earliestCreatedLocalDate(habits: RollupHabitInput[]): string | null {
  return habits.reduce<string | null>(
    (earliest, habit) => (!earliest || compareLocalDates(habit.createdLocalDate, earliest) < 0 ? habit.createdLocalDate : earliest),
    null
  );
}

/**
 * Reconstruct the streak state as of `localDate` from what's already
 * stored, rather than persisting `gracesUsedThisMonth` as its own column —
 * it's fully derivable from how many graced rows already exist this month
 * (CLAUDE.md invariant #1: nothing about growth gets stored redundantly).
 */
export async function loadStreakStateAsOf(client: RollupDbClient, userId: string, localDate: string): Promise<StreakState> {
  const lastRollup = await client.dayRollup.findUnique({
    where: { userId_localDate: { userId, localDate: toDbDate(localDate) } },
  });
  if (!lastRollup) return initialStreakState();

  const monthKey = localDate.slice(0, 7);
  const monthStart = `${monthKey}-01`;
  const gracesUsedThisMonth = await client.dayRollup.count({
    where: {
      userId,
      localDate: { gte: toDbDate(monthStart), lte: toDbDate(localDate) },
      gracedDay: true,
    },
  });

  return { streakLength: lastRollup.streakLength, gracesUsedThisMonth, monthKey };
}
