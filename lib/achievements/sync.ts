import { formatDbDate, toDbDate } from "@/lib/dates";
import { loadHabitsForRollup, type RollupDbClient } from "@/lib/rollup/loaders";
import { evaluateAchievements, type AchievementRollupInput, type EarnedAchievement } from "./evaluate";
import { loadCompletionsForAchievements } from "./loaders";

/**
 * Lazily evaluate and persist achievements for a user (build plan §6.3:
 * "Evaluate in the same job that writes DayRollup, so a rollup recompute
 * correctly regenerates unlocks"). No scheduler on Vercel Hobby (CLAUDE.md
 * invariant #6), so — like `ensureGardenCurrent` — this recomputes the full
 * earned set from scratch on every call and only ever *inserts* the rows
 * that are missing. An achievement is never revoked once earned (write-once,
 * same as `Tile` under CLAUDE.md invariant #1), which is what makes this
 * naturally idempotent: running it twice in a row inserts nothing the
 * second time.
 *
 * Returns only the newly-inserted rows, for an unlock feed / toast.
 */
export async function ensureAchievementsCurrent(
  client: RollupDbClient,
  userId: string,
  timezone: string
): Promise<EarnedAchievement[]> {
  const [habits, completions, rollupRows, existing] = await Promise.all([
    loadHabitsForRollup(client, userId, timezone),
    loadCompletionsForAchievements(client, userId, timezone),
    client.dayRollup.findMany({
      where: { userId },
      orderBy: { localDate: "asc" },
      select: { localDate: true, scheduled: true, ratio: true, streakLength: true },
    }),
    client.achievementUnlock.findMany({ where: { userId }, select: { achievementKey: true } }),
  ]);

  const rollups: AchievementRollupInput[] = rollupRows.map((row) => ({
    localDate: formatDbDate(row.localDate),
    scheduled: row.scheduled,
    ratio: row.ratio,
    streakLength: row.streakLength,
  }));

  const earned = evaluateAchievements({ rollups, completions, habits });

  const existingKeys = new Set(existing.map((row) => row.achievementKey));
  const newlyEarned = earned.filter((achievement) => !existingKeys.has(achievement.achievementKey));

  if (newlyEarned.length > 0) {
    await client.achievementUnlock.createMany({
      data: newlyEarned.map((achievement) => ({
        userId,
        achievementKey: achievement.achievementKey,
        earnedOnDate: toDbDate(achievement.earnedOnDate),
      })),
      skipDuplicates: true,
    });
  }

  return newlyEarned;
}
