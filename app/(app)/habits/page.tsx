import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { archiveHabit, createHabit, updateHabit } from "@/lib/actions/habits";
import { HabitFormFields } from "@/components/habits/habit-form-fields";
import { emojiForIconKey } from "@/lib/habits/icons";

export default async function HabitsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const habits = await db.habit.findMany({
    where: { userId: session.user.id, archivedAt: null },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-8 p-6">
      <h1 className="text-2xl font-semibold">Habits</h1>

      <section className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4">
        <h2 className="text-lg font-medium">Add a habit</h2>
        <form action={createHabit} className="flex flex-col gap-3">
          <HabitFormFields />
          <button
            type="submit"
            className="self-start rounded-md bg-black px-4 py-2 text-white"
          >
            Add habit
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-4">
        {habits.length === 0 ? (
          <p className="text-sm text-gray-500">No habits yet — add your first one above.</p>
        ) : (
          habits.map((habit) => (
            <details key={habit.id} className="rounded-lg border border-gray-200 p-4">
              <summary className="cursor-pointer text-lg font-medium">
                {emojiForIconKey(habit.iconKey)} {habit.name}
              </summary>
              <form
                action={updateHabit.bind(null, habit.id)}
                className="mt-4 flex flex-col gap-3"
              >
                <HabitFormFields
                  defaults={{
                    name: habit.name,
                    iconKey: habit.iconKey,
                    scheduleMask: habit.scheduleMask,
                    targetPerDay: habit.targetPerDay,
                  }}
                />
                <button
                  type="submit"
                  className="self-start rounded-md bg-black px-4 py-2 text-white"
                >
                  Save changes
                </button>
              </form>
              <form action={archiveHabit.bind(null, habit.id)} className="mt-2">
                <button type="submit" className="text-sm text-red-600 underline">
                  Archive
                </button>
              </form>
            </details>
          ))
        )}
      </section>
    </main>
  );
}
