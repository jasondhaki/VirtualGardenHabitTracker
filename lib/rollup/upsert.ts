import { toDbDate } from "@/lib/dates";
import type { DayRollupResult } from "./compute";
import type { RollupDbClient } from "./loaders";

export async function upsertRollupRows(client: RollupDbClient, userId: string, rows: DayRollupResult[]): Promise<void> {
  for (const row of rows) {
    const localDate = toDbDate(row.localDate);
    await client.dayRollup.upsert({
      where: { userId_localDate: { userId, localDate } },
      create: {
        userId,
        localDate,
        scheduled: row.scheduled,
        completed: row.completed,
        ratio: row.ratio,
        pointsEarned: row.pointsEarned,
        streakLength: row.streakLength,
        gracedDay: row.gracedDay,
      },
      update: {
        scheduled: row.scheduled,
        completed: row.completed,
        ratio: row.ratio,
        pointsEarned: row.pointsEarned,
        streakLength: row.streakLength,
        gracedDay: row.gracedDay,
      },
    });
  }
}
