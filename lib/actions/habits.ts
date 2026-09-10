"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { HABIT_ICONS } from "@/lib/habits/icons";
import { maskFromDayKeys, SCHEDULE_DAYS } from "@/lib/habits/schedule";

const iconKeys = HABIT_ICONS.map((icon) => icon.key) as [string, ...string[]];
const dayKeys = SCHEDULE_DAYS.map((day) => day.key) as [string, ...string[]];

const habitInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  iconKey: z.enum(iconKeys),
  days: z.array(z.enum(dayKeys)).min(1, "Pick at least one day"),
  targetPerDay: z.coerce.number().int().min(1).max(20),
});

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  return session.user.id;
}

function parseHabitFormData(formData: FormData) {
  return habitInputSchema.parse({
    name: formData.get("name"),
    iconKey: formData.get("iconKey"),
    days: formData.getAll("day"),
    targetPerDay: formData.get("targetPerDay"),
  });
}

export async function createHabit(formData: FormData) {
  const userId = await requireUserId();
  const input = parseHabitFormData(formData);
  const scheduleMask = maskFromDayKeys(input.days);

  const lastHabit = await db.habit.findFirst({
    where: { userId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  await db.habit.create({
    data: {
      userId,
      name: input.name,
      iconKey: input.iconKey,
      scheduleMask,
      targetPerDay: input.targetPerDay,
      sortOrder: (lastHabit?.sortOrder ?? -1) + 1,
    },
  });

  revalidatePath("/habits");
  revalidatePath("/today");
}

export async function updateHabit(habitId: string, formData: FormData) {
  const userId = await requireUserId();
  const input = parseHabitFormData(formData);
  const scheduleMask = maskFromDayKeys(input.days);

  const habit = await db.habit.findUnique({ where: { id: habitId }, select: { userId: true } });
  if (!habit || habit.userId !== userId) {
    throw new Error("Habit not found");
  }

  await db.habit.update({
    where: { id: habitId },
    data: {
      name: input.name,
      iconKey: input.iconKey,
      scheduleMask,
      targetPerDay: input.targetPerDay,
    },
  });

  revalidatePath("/habits");
  revalidatePath("/today");
}

export async function archiveHabit(habitId: string) {
  const userId = await requireUserId();

  const habit = await db.habit.findUnique({ where: { id: habitId }, select: { userId: true } });
  if (!habit || habit.userId !== userId) {
    throw new Error("Habit not found");
  }

  await db.habit.update({
    where: { id: habitId },
    data: { archivedAt: new Date() },
  });

  revalidatePath("/habits");
  revalidatePath("/today");
}
