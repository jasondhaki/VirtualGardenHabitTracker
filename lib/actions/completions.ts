"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { todayLocalDate, toDbDate } from "@/lib/dates";

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

  const existing = await db.completion.findUnique({
    where: { habitId_localDate: { habitId, localDate: dbDate } },
  });

  if (existing) {
    await db.completion.delete({ where: { id: existing.id } });
  } else {
    await db.completion.create({
      data: { habitId, userId, localDate: dbDate },
    });
  }

  revalidatePath("/today");

  return { completed: !existing };
}
