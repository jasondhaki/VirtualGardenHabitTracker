import { formatInTimeZone } from "date-fns-tz";
import { formatDbDate } from "@/lib/dates";
import type { RollupDbClient } from "@/lib/rollup/loaders";
import type { AchievementCompletionInput } from "./evaluate";

/**
 * Every completion a user has ever logged, with the wall-clock hour
 * `createdAt` resolves to in their timezone — the one fact `early_riser`
 * needs that the rollup-oriented loaders in `lib/rollup/loaders.ts` don't
 * carry (they only need `localDate` + `count`).
 */
export async function loadCompletionsForAchievements(
  client: RollupDbClient,
  userId: string,
  timezone: string
): Promise<AchievementCompletionInput[]> {
  const completions = await client.completion.findMany({
    where: { userId },
    select: { habitId: true, localDate: true, createdAt: true },
  });

  return completions.map((completion) => ({
    habitId: completion.habitId,
    localDate: formatDbDate(completion.localDate),
    localHour: Number(formatInTimeZone(completion.createdAt, timezone, "H")),
  }));
}
