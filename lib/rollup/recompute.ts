import { db } from "@/lib/db";
import { todayLocalDate } from "@/lib/dates";
import { ensureAchievementsCurrent } from "@/lib/achievements/sync";
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

    // Re-evaluate in the same job that rewrote DayRollup (build plan §6.3),
    // so a recompute regenerates any unlocks a since-fixed schedule/target
    // edit should have produced. Write-once (CLAUDE.md invariant #1): this
    // only ever inserts rows still missing, never revokes an earned one.
    await ensureAchievementsCurrent(tx, userId, user.timezone);
  });
}
