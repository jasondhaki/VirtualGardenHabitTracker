# CLAUDE.md

Habit tracker where completed habits grow a shared pixel-art garden.
Portfolio project. Full design rationale lives in `docs/BUILD_PLAN.md` — read it before proposing architectural changes.

## Stack

Next.js 15 (App Router) · TypeScript · Prisma · PostgreSQL (Neon) · Tailwind v4 · Auth.js v5 · Vitest · Vercel Hobby

## Commands

```bash
pnpm dev                    # dev server
pnpm test                   # vitest run
pnpm test:watch             # vitest watch
pnpm lint                   # eslint
pnpm typecheck              # tsc --noEmit
pnpm db:migrate             # prisma migrate dev
pnpm db:studio              # prisma studio
pnpm db:seed                # seed species catalog
pnpm db:seed:demo           # seed the 120-day demo garden
```

---

## Invariants

These are load-bearing. Violating them causes bugs that surface weeks later, not at the point of the mistake.

### 1. Garden growth is derived, never stored

Growth stage, streaks, totals and wilt state are **computed from `Completion` + `DayRollup`**. Never write a `stage` column and increment it.

The exceptions — written once at tile unlock, never mutated after:

- `Tile.speciesId`
- `Tile.placementOrder`
- `Tile.unlockedAtPoints`

If you find yourself writing an `UPDATE` against `Tile`, stop. It's almost certainly wrong.

This property is what makes the timeline scrubber and demo seeding work. Breaking it breaks both.

### 2. Dates resolve server-side, in the user's timezone

```ts
// ✅ the only correct way to get "today"
import { formatInTimeZone } from 'date-fns-tz';
const localDate = formatInTimeZone(new Date(), user.timezone, 'yyyy-MM-dd');

// ❌ never
new Date().toISOString().split('T')[0]
```

- `Completion.localDate` and `DayRollup.localDate` are Postgres `DATE`, not timestamps
- Never derive the current date on the client
- Never compare a `DATE` against a `DateTime` without normalizing first

This is the #1 source of correctness bugs in this codebase. Assume any date bug is a timezone bug until proven otherwise.

### 3. Migrations only

- Use `prisma migrate dev`. **Never `prisma db push`.**
- **Never `prisma db pull`** — it destructively overwrites `schema.prisma`. Use `prisma migrate status` to check connectivity.
- Schema drift requires a delta migration + `migrate resolve` + shadow DB verification. Avoid creating it.

### 4. Streaks are schedule-aware

`Habit.scheduleMask` is a 7-bit int (Mon=1 … Sun=64). A Mon/Wed/Fri habit **must not break on Tuesday**.

Any streak query that counts consecutive calendar days is wrong. Filter to scheduled days first.

Also respect: 2 grace days per calendar month, applied silently, never surfaced as a prompt.

### 5. Placement is deterministic

The garden fills itself via a seeded spiral order derived from `User.gardenSeed`.

- Use `mulberry32(seed)` from `lib/prng.ts`. **Never `Math.random()`** anywhere in placement, species assignment, or layout.
- Same seed + same history must always produce the identical garden. There are property tests asserting this — don't skip them.
- Feature slots only ever receive `RARE` or `LEGENDARY` species.

### 6. No scheduler

Vercel Hobby caps cron at 2 jobs / daily. Rollups backfill **lazily on read** via `ensureRollupsCurrent(userId)`.

Don't propose a cron job for rollups, achievements, or streak recomputation.

### 7. Everything must be free

Before adding any dependency or service, confirm it has a genuinely free tier with no domain requirement and no trial expiry.

Already ruled out: Cloudinary, any transactional email provider, custom domains, Vercel Pro.

---

## Conventions

**State.** Server Components by default. Mutations are Server Actions with Zod-validated input. Client state uses `useOptimistic` only.
No Zustand, no Redux, no Context for server-derived data. If you think you need a store, you probably need a `revalidatePath`.

**Rendering the garden.** CSS grid of divs with sprite-sheet `background-position` and `image-rendering: pixelated`.
No canvas, no WebGL, no `<img>` per tile. Respect `prefers-reduced-motion` — disable sway entirely under it.

**Storage.** No `localStorage` or `sessionStorage` for anything that matters. Server is the only source of truth.

**Points are integers.** Never floats. `ratio` is the only float in the growth path, and it never gets persisted un-rounded into a points column.

**Achievements live in code**, in `lib/achievements/catalog.ts`. Evaluated against `DayRollup`. Only earned rows go in the DB. Adding an achievement must never require a migration.

---

## Layout

```
app/
  (auth)/          sign-in
  today/           daily driver — optimize this ruthlessly
  garden/          full garden + plot switcher + scrubber
  habits/          CRUD + schedule editor
  species/         collection
  stats/           heatmap, adherence
  demo/            STATIC. must never touch the database
  g/[username]/    opengraph-image route
lib/
  dates/           timezone-safe date helpers — use these, don't inline
  growth/          points, streaks, wilt tiers
  rollup/          ensureRollupsCurrent, backfill, recompute
  garden/          placement engine, species assignment
  achievements/    catalog + evaluator
  prng.ts          mulberry32
prisma/
  migrations/
  seed.ts
  seed-demo.ts
docs/
  BUILD_PLAN.md
```

`/demo` is statically generated with `revalidate`. It renders off the CDN and must never hit a cold Neon instance — that page is the project's first impression.

---

## Testing

Run `pnpm test` before declaring any growth, rollup or placement work done.

Non-negotiable coverage:

- Month/year boundaries, DST spring-forward and fall-back
- User changes timezone mid-streak
- Scheduled-day-aware streaks (the Tuesday case)
- Grace day consumption and monthly reset
- Full rollup recompute from `Completion` reproduces stored `DayRollup` exactly
- Achievement re-evaluation after recompute is idempotent
- Placement determinism (same seed + history → identical garden)

If a change touches `lib/growth`, `lib/rollup` or `lib/garden`, it needs a test. These are the parts that fail silently.

---

## Working notes

- Ship phases in order (see `docs/BUILD_PLAN.md` §11). Static plants over correct data beat animated plants over broken streak math.
- Prefer fixing the derivation over adding a stored field. Adding a column to dodge a computation is how this codebase would rot.
- When something looks off in the garden, check `DayRollup` first — it's derived, so the bug is upstream.


## Agent Verification Protocol

Before declaring any feature, bugfix, or refactor complete:
1. Run `pnpm typecheck` and ensure 0 errors. Never use `@ts-ignore` or `any` to bypass errors.
2. Run `pnpm test` if changes touch `lib/`, mutations, or calculations.
3. Check `git status` and ensure no unintended file churn or missing migrations.

## Next.js 15 & Prisma Nuances

- **Next.js 15 Async Route APIs:** `params`, `searchParams`, `cookies()`, and `headers()` are Promises. Always `await` them before reading properties (e.g., `const { username } = await params;`).
- **Prisma `DATE` Fields:** Postgres `DATE` columns hydrate as JS `Date` at UTC midnight. Never format them with naive date utilities. Route all reading and formatting through `lib/dates/`.
- **Bitmask Queries:** Filter `scheduleMask` bitwise operations in TypeScript logic for single-user queries, or use `prisma.$queryRaw` if filtering across scheduled habits in SQL. Do not attempt unsupported bitwise syntax in standard Prisma filter clauses.