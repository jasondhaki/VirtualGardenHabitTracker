"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { todayLocalDate, toDbDate } from "@/lib/dates";
import { ensureRollupsCurrent } from "@/lib/rollup/ensure-current";
import { upsertTodayRollup } from "@/lib/rollup/today";

const toggleCompletionSchema = z.object({
  habitId: z.string().min(1),
});

/**
 * Toggles today's completion for a habit. "Today" is always recomputed
 * server-side from the signed-in user's stored timezone — never trust a
 * client-supplied date here (see CLAUDE.md invariant #2).
 */
export async function toggleCompletion(input: { habitId: string }) {
  const { habitId } = toggleCompletionSchema.parse(input);

  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  const userId = session.user.id;

  const habit = await db.habit.findUnique({
    where: { id: habitId },
    select: { userId: true, archivedAt: true },
  });
  if (!habit || habit.userId !== userId || habit.archivedAt) {
    throw new Error("Habit not found");
  }

  const localDate = todayLocalDate(session.user.timezone);
  const dbDate = toDbDate(localDate);

  // Backfill through yesterday first so today's rollup has a streak state
  // to resume from. Cheap no-op once the user is already current.
  await ensureRollupsCurrent(userId);

  const existing = await db.completion.findUnique({
    where: { habitId_localDate: { habitId, localDate: dbDate } },
  });

  await db.$transaction(async (tx) => {
    if (existing) {
      await tx.completion.delete({ where: { id: existing.id } });
    } else {
      await tx.completion.create({
        data: { habitId, userId, localDate: dbDate },
      });
    }

    // Rollup write path inside the completion transaction (build plan §11
    // P3) — a check-off and its effect on today's garden state land atomically.
    await upsertTodayRollup(tx, userId, session.user.timezone);
  });

  revalidatePath("/today");

  return { completed: !existing };
}
