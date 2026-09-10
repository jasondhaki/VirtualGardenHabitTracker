"use client";

import { useOptimistic, useTransition } from "react";
import { toggleCompletion } from "@/lib/actions/completions";
import { emojiForIconKey } from "@/lib/habits/icons";

type Habit = {
  id: string;
  name: string;
  iconKey: string;
};

export function TodayHabitList({
  habits,
  initialCompletions,
}: {
  habits: Habit[];
  initialCompletions: Record<string, boolean>;
}) {
  const [isPending, startTransition] = useTransition();
  const [optimisticCompletions, setOptimisticCompletion] = useOptimistic(
    initialCompletions,
    (state, habitId: string) => ({ ...state, [habitId]: !state[habitId] })
  );

  function handleToggle(habitId: string) {
    startTransition(async () => {
      setOptimisticCompletion(habitId);
      await toggleCompletion({ habitId });
    });
  }

  return (
    <ul className="flex flex-col gap-2">
      {habits.map((habit) => {
        const done = optimisticCompletions[habit.id] ?? false;
        return (
          <li key={habit.id}>
            <button
              type="button"
              onClick={() => handleToggle(habit.id)}
              disabled={isPending}
              aria-pressed={done}
              className={`flex w-full items-center justify-between rounded-md border px-4 py-3 text-left transition-colors ${
                done ? "border-green-600 bg-green-50" : "border-gray-300 bg-white"
              }`}
            >
              <span className="flex items-center gap-2">
                <span aria-hidden="true">{emojiForIconKey(habit.iconKey)}</span>
                <span>{habit.name}</span>
              </span>
              <span aria-hidden="true">{done ? "✓" : ""}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
