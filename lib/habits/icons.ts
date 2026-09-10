/**
 * Fixed icon pool for habits. `Habit.iconKey` stores the `key`, never the
 * emoji itself, so the rendered glyph can change later without a migration.
 */
export const HABIT_ICONS = [
  { key: "check", emoji: "✅" },
  { key: "water", emoji: "💧" },
  { key: "run", emoji: "🏃" },
  { key: "book", emoji: "📖" },
  { key: "meditate", emoji: "🧘" },
  { key: "salad", emoji: "🥗" },
  { key: "sleep", emoji: "😴" },
  { key: "write", emoji: "✍️" },
  { key: "code", emoji: "💻" },
  { key: "sun", emoji: "☀️" },
] as const;

export type HabitIconKey = (typeof HABIT_ICONS)[number]["key"];

const EMOJI_BY_KEY = new Map<string, string>(HABIT_ICONS.map((icon) => [icon.key, icon.emoji]));

export function emojiForIconKey(iconKey: string): string {
  return EMOJI_BY_KEY.get(iconKey) ?? HABIT_ICONS[0].emoji;
}
