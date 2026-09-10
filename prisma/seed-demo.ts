import { db } from "@/lib/db";
import { addDaysToLocalDate, toDbDate, todayLocalDate } from "@/lib/dates";
import { ensureGardenCurrent } from "@/lib/garden/sync";
import { DEMO_GARDEN_SEED, DEMO_HABITS, DEMO_HISTORY_DAYS, generateDemoCompletions } from "@/lib/demo/scenario";

const DEMO_EMAIL = "demo@habitgarden.app";
const DEMO_USERNAME = "demo";
const DEMO_TIMEZONE = "UTC";

function localDateTime(localDate: string, hour: number): Date {
  return new Date(`${localDate}T${String(hour).padStart(2, "0")}:00:00.000Z`);
}

/**
 * Seeds a real, DB-backed demo account for local dev/QA — log in and poke
 * at a realistic garden through the normal authenticated flow. This is a
 * *separate* lifecycle from the static, zero-DB `/demo` page (`lib/demo/build.ts`
 * runs the same scenario purely in-memory, no database involved at all): this
 * script writes real `Completion` rows and lets the normal lazy-backfill
 * pipeline take it from there — "a seed script plus a rollup recompute,
 * nothing more" (build plan §13.1). Because `ensureRollupsCurrent` always
 * backfills through the *real* current date, this account will visibly decay
 * (empty days accruing past the seeded window) if you don't re-run this
 * before demoing — that's expected, just re-run `pnpm db:seed:demo`.
 *
 * Idempotent: re-running wipes this one demo user's dependent rows and
 * rebuilds them from scratch, rather than trying to diff/merge against
 * `lib/demo/scenario.ts` if it's changed since the last run.
 */
async function main() {
  const endDate = todayLocalDate(DEMO_TIMEZONE);
  const startDate = addDaysToLocalDate(endDate, -(DEMO_HISTORY_DAYS - 1));
  const offsetToDate = (dayOffset: number) => addDaysToLocalDate(startDate, dayOffset);

  const existing = await db.user.findUnique({ where: { email: DEMO_EMAIL }, select: { id: true } });

  let userId: string;
  if (existing) {
    userId = existing.id;
    await db.$transaction([
      db.completion.deleteMany({ where: { userId } }),
      db.dayRollup.deleteMany({ where: { userId } }),
      db.tile.deleteMany({ where: { userId } }),
      db.achievementUnlock.deleteMany({ where: { userId } }),
      db.habit.deleteMany({ where: { userId } }),
    ]);
    await db.user.update({
      where: { id: userId },
      data: { username: DEMO_USERNAME, gardenSeed: DEMO_GARDEN_SEED, currentPlotCount: 1, timezone: DEMO_TIMEZONE },
    });
  } else {
    const user = await db.user.create({
      data: { email: DEMO_EMAIL, username: DEMO_USERNAME, gardenSeed: DEMO_GARDEN_SEED, timezone: DEMO_TIMEZONE },
    });
    userId = user.id;
  }

  await db.habit.createMany({
    data: DEMO_HABITS.map((habit, index) => ({
      id: habit.id,
      userId,
      name: habit.name,
      iconKey: habit.iconKey,
      scheduleMask: habit.scheduleMask,
      targetPerDay: habit.targetPerDay,
      sortOrder: index,
      createdAt: toDbDate(startDate),
    })),
  });

  const completions = generateDemoCompletions();
  await db.completion.createMany({
    data: completions.map((completion) => ({
      habitId: completion.habitId,
      userId,
      localDate: toDbDate(offsetToDate(completion.dayOffset)),
      count: completion.count,
      createdAt: localDateTime(offsetToDate(completion.dayOffset), completion.localHour),
    })),
  });

  await ensureGardenCurrent(userId);

  console.log(`Seeded demo user "${DEMO_USERNAME}" (${userId}) with ${completions.length} completions over ${DEMO_HISTORY_DAYS} days.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
