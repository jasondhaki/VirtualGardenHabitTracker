import { db } from "@/lib/db";
import { todayLocalDate } from "@/lib/dates";
import { computeRollupRange } from "./compute";
import { earliestCreatedLocalDate, loadCompletionsForRollup, loadHabitsForRollup } from "./loaders";
import { upsertRollupRows } from "./upsert";
import { initialStreakState } from "@/lib/growth/streaks";

/**
 * Wipe and rebuild every `DayRollup` row for a user straight from
 * `Completion`, starting fresh streak/grace state. This is the "recompute
 * job" from build plan §11 P3 — it exists so `DayRollup` can always be
 * proven to be a pure function of `Completion` (CLAUDE.md invariant #1),
 * and it's what a future schedule/target edit or a manual "fix my garden"
 * action would call.
 */
export async function recomputeAllRollups(userId: string): Promise<void> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { timezone: true } });
  if (!user) return;

  const habits = await loadHabitsForRollup(db, userId, user.timezone);
  const from = earliestCreatedLocalDate(habits);

  await db.$transaction(async (tx) => {
    await tx.dayRollup.deleteMany({ where: { userId } });
    if (!from) return;

    const today = todayLocalDate(user.timezone);
    const completions = await loadCompletionsForRollup(tx, userId, from, today);
    const rows = computeRollupRange(from, today, habits, completions, initialStreakState());
    await upsertRollupRows(tx, userId, rows);
  });
}
