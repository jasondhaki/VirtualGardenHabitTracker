import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { todayLocalDate, toDbDate } from "@/lib/dates";
import { isScheduledOn } from "@/lib/habits/schedule";
import { TodayHabitList } from "@/components/today/today-habit-list";

export default async function TodayPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const localDate = todayLocalDate(session.user.timezone);
  const dbDate = toDbDate(localDate);

  const habits = await db.habit.findMany({
    where: { userId: session.user.id, archivedAt: null },
    orderBy: { sortOrder: "asc" },
  });

  const scheduledHabits = habits.filter((habit) => isScheduledOn(habit.scheduleMask, localDate));

  const completions = scheduledHabits.length
    ? await db.completion.findMany({
        where: {
          userId: session.user.id,
          localDate: dbDate,
          habitId: { in: scheduledHabits.map((habit) => habit.id) },
        },
        select: { habitId: true },
      })
    : [];
  const completedHabitIds = new Set(completions.map((completion) => completion.habitId));

  const initialCompletions = Object.fromEntries(
    scheduledHabits.map((habit) => [habit.id, completedHabitIds.has(habit.id)])
  );

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Today</h1>
      {scheduledHabits.length === 0 ? (
        <p className="text-sm text-gray-500">
          Nothing scheduled today.{" "}
          <Link href="/habits" className="underline">
            Add a habit
          </Link>{" "}
          to get started.
        </p>
      ) : (
        <TodayHabitList habits={scheduledHabits} initialCompletions={initialCompletions} />
      )}
    </main>
  );
}
