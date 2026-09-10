# Habit Garden — Build Plan

A habit tracker where completed habits grow a shared pixel-art garden. Portfolio piece.

---

## 1. Concept

Every habit you complete feeds one shared garden. Adherence earns growth points, points unlock garden tiles, tiles fill themselves with plants drawn from a species pool you expand through steady progress and hidden achievements. A strong month produces a full, lush plot. A lapsed month produces a large garden that has visibly wilted.

**Target pacing:** 30 days of perfect adherence fills the starter plot. Realistic adherence (~70%) fills it in about 48 days.

---

## 2. Core design principles

These three rules drive nearly every decision downstream. Break them and half the feature list gets expensive.

### 2.1 Growth is derived, layout is stored

Garden growth is a pure function of completion history. A check-off writes exactly one row; nothing about the garden is mutated in place.

This buys you three things that are otherwise expensive:

- **Demo mode** becomes a seed script rather than hand-built fixtures
- **The timeline scrubber** (drag through 90 days, watch the garden grow and wilt) is nearly free
- **No drift.** Storing `plant.stage = 3` and incrementing it on every check-off guarantees eventual inconsistency with the underlying log

The compromise: *where* a plant sits and *which* species it is are written once when a tile unlocks. *How grown* it is stays computed.

### 2.2 Ratio, not raw count

Growth is scored on habits completed ÷ habits scheduled for that day. Scoring raw completion count would let someone with 12 habits grow four times faster than someone with 3, punishing focus and rewarding habit-spam.

### 2.3 Plants wilt, never die

Missing a week desaturates and droops the garden. It never deletes it. An app that destroys your progress after a bad week is the reason people abandon habit trackers. Two grace days per month, applied silently.

---

## 3. Growth mechanics

### 3.1 Daily points

```
ratio        = mean(per-habit fractional completion, each capped at 1.0)
basePoints   = round(10 × ratio^0.7)
multiplier   = 1 + min(streak, 30) × 0.033        // caps at 2.0 at day 30
dailyPoints  = basePoints × multiplier
```

The `^0.7` exponent is deliberately generous: a 60% day earns 7 points rather than 6. Partial credit is what stops people writing off a bad day entirely.

The multiplier caps at 2.0 so a returning user can still realistically catch up.

**Perfect 30 days totals ~443 points.** Round to **450 points to fill the starter plot.**

### 3.2 Points do two separate jobs

| Purpose | Window | Effect |
|---|---|---|
| **Tile unlocks** | Cumulative, permanent | Garden size grows and never shrinks |
| **Plant growth stage** | Trailing 14 days | Plants advance, hold, or wilt |

This split is what makes the garden read as a picture of your life. Size shows total investment. Health shows the last two weeks. A lapsed user sees a big wilting garden, which is exactly the right emotional signal.

### 3.3 Streaks

- A streak counts consecutive **scheduled** days met, not consecutive calendar days
- A Mon/Wed/Fri habit must not break on Tuesday — this is what `scheduleMask` exists for
- A day counts toward the streak at ratio ≥ 0.6
- Grace days: 2 per calendar month, consumed automatically, never surfaced as a prompt

### 3.4 Wilting

Based on trailing 14-day average ratio:

| Avg ratio | State | Visual |
|---|---|---|
| ≥ 0.8 | Thriving | Full saturation, sway animation, occasional particles |
| 0.5–0.8 | Healthy | Full saturation, sway |
| 0.25–0.5 | Drooping | 70% saturation, reduced sway, slight downward tilt |
| < 0.25 | Dormant | 40% saturation, no sway, muted palette |

Recovery is immediate. One good day visibly lifts the garden, which is the reward for returning.

---

## 4. Garden structure

### 4.1 Starter plot

- **6×6 grid = 36 tiles**
- 4 tiles reserved for a pond and path decoration
- **32 plantable tiles**

### 4.2 Unlock curve

```
tileUnlockPoints(n) = round(450 × (n / 32) ^ 1.6)
```

Front-loaded, so day one is generous:

| Day (perfect) | Cumulative points | Tiles |
|---|---|---|
| 1 | 10 | 2 |
| 3 | 31 | 6 |
| 7 | 77 | 10 |
| 10 | 115 | 13 |
| 16 | 200 | 19 |
| 20 | 263 | 22 |
| 25 | 349 | 27 |
| 30 | 444 | 32 |

Two or three plants appear on the very first day. That first session has to feel like something happened.

### 4.3 Plot expansion (the day 31 problem)

30 days is fast, which means your most engaged users hit a wall right as the habit is actually sticking.

At 450 points, **a second 6×6 plot unlocks** adjacent to the first and the garden view zooms out.

| Plot | Cost | Reached around |
|---|---|---|
| 1 | 450 | day 30 |
| 2 | +900 | day 75 |
| 3 | +1350 | day 140 |

The pace slows exactly as intrinsic motivation takes over, which is the correct shape. A three-plot garden also reads as commitment at a glance.

---

## 5. Placement engine

The garden fills itself. That removed the entire drag-and-drop UI but added an algorithm with three hard requirements: **deterministic**, **aesthetically ordered**, **stable**.

### 5.1 Fixed placement order

At signup, store a `gardenSeed` on the user. Generate a spiral-outward ordering of the 32 tiles, jittered by that seed so no two gardens are identical.

Tile at position *n* in that order unlocks at threshold *n*.

Because the order is fixed up front:
- Growth radiates naturally from the center
- A new plant never rearranges existing ones
- The same seed plus the same history always produces the same garden

### 5.2 Feature slots

Mark **5 tiles as feature slots**: the center, and four positions at roughly the thirds of the plot.

When an achievement-gated rare species is earned, it claims the next open feature slot. This is what makes rares actually visible rather than buried behind a hedge in the corner.

Common and uncommon species fill everything else, weighted by the user's unlocked pool with a mild recency penalty so the same species doesn't cluster.

### 5.3 Write-once assignment

When a tile unlocks, write the `Tile` row with its assigned species and stop. Species assignment depends on which species were unlocked *at that moment*, so it's history-dependent and must be persisted. Growth stage stays derived, which keeps the timeline scrubber working.

### 5.4 Seeded PRNG

Don't add a dependency. Mulberry32 is ten lines:

```ts
export function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

---

## 6. Species and unlocks

Two parallel tracks.

### 6.1 Point-gated track (common, uncommon)

A steady drip roughly every 40 points, so about 11 species over the starter plot. Predictable, visible progress. Show the next unlock and its threshold in the UI.

### 6.2 Achievement-gated track (rare, legendary)

Never announced in advance. The surprise is the point.

| Key | Condition | Rarity |
|---|---|---|
| `first_sprout` | First completion ever | Common |
| `perfect_week` | 7 consecutive 100% days | Rare |
| `fortnight` | 14-day streak | Rare |
| `comeback` | Reach a 7-day streak after a 7+ day gap | Rare |
| `early_riser` | 20 completions logged before 8am local | Rare |
| `steadfast` | 30-day streak | Legendary |
| `polyculture` | 5+ active habits, all ≥80% over 30 days | Legendary |
| `four_seasons` | At least one completion in each season | Legendary |

`comeback` matters more than it looks. It's the only achievement that *requires* having failed. Rewarding recovery is the difference between an app people return to and one they abandon after their first bad week.

### 6.3 Achievements live in code

Definitions are logic evaluated against `DayRollup`, not data. Keeping them in a TypeScript catalog means adding new ones without a migration. Only the earned rows go in the database.

Evaluate in the same job that writes `DayRollup`, so a rollup recompute correctly regenerates unlocks.

---

## 7. Data model

```prisma
model User {
  id                String   @id @default(cuid())
  email             String   @unique
  timezone          String   // IANA, e.g. "Asia/Dhaka"
  gardenSeed        Int
  currentPlotCount  Int      @default(1)
  createdAt         DateTime @default(now())

  habits            Habit[]
  completions       Completion[]
  dayRollups        DayRollup[]
  tiles             Tile[]
  unlocks           SpeciesUnlock[]
  achievements      AchievementUnlock[]
}

model Habit {
  id            String    @id @default(cuid())
  userId        String
  name          String
  iconKey       String
  scheduleMask  Int       // 7-bit, Mon=1 … Sun=64
  targetPerDay  Int       @default(1)
  sortOrder     Int
  archivedAt    DateTime?

  user          User         @relation(fields: [userId], references: [id])
  completions   Completion[]

  @@index([userId, archivedAt])
}

model Completion {
  id         String   @id @default(cuid())
  habitId    String
  userId     String
  localDate  DateTime @db.Date   // bare date in the user's timezone
  count      Int      @default(1)
  createdAt  DateTime @default(now())

  habit      Habit  @relation(fields: [habitId], references: [id])
  user       User   @relation(fields: [userId], references: [id])

  @@unique([habitId, localDate])
  @@index([userId, localDate])
}

model DayRollup {
  userId        String
  localDate     DateTime @db.Date
  scheduled     Int
  completed     Int
  ratio         Float
  pointsEarned  Int
  streakLength  Int
  gracedDay     Boolean  @default(false)

  user          User @relation(fields: [userId], references: [id])

  @@id([userId, localDate])
  @@index([userId, localDate(sort: Desc)])
}

model Species {
  id              String      @id @default(cuid())
  key             String      @unique
  name            String
  rarity          Rarity
  unlockKind      UnlockKind
  unlockAtPoints  Int?        // null for achievement track
  achievementKey  String?     // null for point track
  spriteKey       String
  stageCount      Int         @default(4)

  tiles           Tile[]
  unlocks         SpeciesUnlock[]
}

model Tile {
  id                String   @id @default(cuid())
  userId            String
  plotIndex         Int
  x                 Int
  y                 Int
  placementOrder    Int
  isFeatureSlot     Boolean  @default(false)
  speciesId         String
  unlockedAtPoints  Int
  assignedAt        DateTime @default(now())

  user              User    @relation(fields: [userId], references: [id])
  species           Species @relation(fields: [speciesId], references: [id])

  @@unique([userId, plotIndex, x, y])
  @@index([userId, plotIndex])
}

model SpeciesUnlock {
  userId     String
  speciesId  String
  unlockedAt DateTime @default(now())

  user       User    @relation(fields: [userId], references: [id])
  species    Species @relation(fields: [speciesId], references: [id])

  @@id([userId, speciesId])
}

model AchievementUnlock {
  userId          String
  achievementKey  String
  earnedOnDate    DateTime @db.Date
  earnedAt        DateTime @default(now())

  user            User @relation(fields: [userId], references: [id])

  @@id([userId, achievementKey])
}

enum Rarity      { COMMON UNCOMMON RARE LEGENDARY }
enum UnlockKind  { POINTS ACHIEVEMENT }
```

### 7.1 Three things to get right

**`localDate` is a `DATE`, not a timestamp.** Store the user's IANA timezone, resolve "today" server-side, write a bare date. This is the single most common correctness bug in habit trackers, and handling it properly is something a reviewer will notice.

**`scheduleMask` as a 7-bit integer.** Streak queries need to skip unscheduled days. A bitmask makes that a cheap `&` in SQL.

**`DayRollup` is a rollup, not an optional cache.** Without it, every garden render scans all history. With it, streaks and totals are a window function over a few hundred rows. Write it in the same transaction as the completion, and keep a recompute job so it can always be rebuilt from `Completion`.

### 7.2 Migration discipline

All of the above goes in the **initial migration**. Retrofitting a write-once table like `Tile` onto existing rows is exactly where schema drift starts.

- Migrations only. Never `db push` on this project.
- Never `prisma db pull` against the managed schema; it overwrites destructively. Use `prisma migrate status` to check connectivity.
- Add a CI drift-check job from day one.

---

## 8. Tech stack

| Layer | Choice | Note |
|---|---|---|
| Framework | Next.js 15 App Router + TypeScript | |
| Styling | Tailwind v4 | |
| Database | PostgreSQL on Neon | |
| ORM | Prisma | |
| Auth | Auth.js v5 | GitHub + Google OAuth (no email provider needed) |
| Hosting | Vercel Hobby | Non-commercial use only |
| Dates | `date-fns` + `date-fns-tz` | Load-bearing |
| Jobs | Lazy eval on read | Hobby caps cron at 2 jobs, daily |
| Validation | Zod | Server Action inputs |
| Tests | Vitest | Non-optional here |
| Mutations | Server Actions + `useOptimistic` | No client store |
| Share images | `next/og` | |
| Sprites | Static PNGs in `/public` | No media service |

### 8.1 Deliberately not included

**No Cloudinary.** Sprite sheets are a handful of static PNGs that never change at runtime. `/public` with an immutable cache header, served off Vercel's CDN.

**No Zustand.** A cart is genuinely client-owned state with no server truth until checkout. Nothing here is. The garden, streaks and unlocks are all derived from the database. The only client state is the half-second between tapping a habit and the server confirming:

```tsx
const [optimisticDone, toggle] = useOptimistic(
  completions,
  (state, habitId: string) => ({ ...state, [habitId]: !state[habitId] })
);
```

A store would mean maintaining a second copy of truth to reconcile against revalidation.

**No canvas.** See §9.2.

### 8.2 Timezone handling

```ts
import { formatInTimeZone } from 'date-fns-tz';

// the only correct way to get "today" for a user
const localDate = formatInTimeZone(new Date(), user.timezone, 'yyyy-MM-dd');
```

Capture at signup with `Intl.DateTimeFormat().resolvedOptions().timeZone`, allow override in settings.

### 8.3 Rollups without a scheduler

Vercel's Hobby tier caps cron at **2 jobs, once per day**. An hourly nightly-close job isn't available on free, so don't design around one.

**Evaluate lazily on read instead.** On any authenticated request, check whether `DayRollup` is current through yesterday for that user. If not, backfill the missing days in a transaction, then continue.

```ts
async function ensureRollupsCurrent(userId: string) {
  const today = formatInTimeZone(new Date(), user.timezone, 'yyyy-MM-dd');
  const last = await getLastRollupDate(userId);
  if (last >= yesterdayOf(today)) return;
  await backfillRollups(userId, dayAfter(last), yesterdayOf(today));
}
```

This is better than a scheduler regardless of cost:

- Rollups compute exactly when someone needs them
- "Yesterday" resolves per-user at read time, so timezones are handled with no UTC-hour bookkeeping
- No scheduled job that can silently fail
- A user returning after three weeks gets 21 rows written in a few milliseconds

Achievement evaluation and grace-day application run inside the same backfill.

**Keeping the database warm** is the one thing this doesn't cover. Use a GitHub Actions scheduled workflow hitting a health endpoint — free on public repos. Note that GitHub disables scheduled workflows after 60 days of repo inactivity.

---

## 9. Rendering

### 9.1 DOM, not canvas

A CSS grid of divs. Each tile is a div with `background-position` into a sprite sheet plus `image-rendering: pixelated`.

At this scale (6×6 up to 18×12 across three plots) the DOM handles it comfortably, and you get hover states, focus rings, keyboard navigation and CSS transitions for free. Canvas costs all of that and buys nothing until you're animating hundreds of sprites.

### 9.2 Layers

```
z0  ground tiles
z1  path, pond, decorations
z2  plants
z3  weather / season overlay
z4  interaction affordances (hover, tooltip)
```

### 9.3 Animation

Sway via `@keyframes` with a per-tile delay so plants don't move in lockstep:

```css
animation-delay: calc((var(--x) * 7 + var(--y) * 13) % 800 * 1ms);
```

Respect `prefers-reduced-motion` and disable sway entirely under it.

### 9.4 Assets

You are not drawing these yourself.

- **Kenney.nl** — CC0, no attribution required, farm and nature packs
- **Cup Nooble, Sprout Lands** (itch.io) — closer to the cozy aesthetic
- **LimeZu** (itch.io) — cozy tilesets

Check licenses before shipping publicly. Put attribution in the README and site footer regardless. Licensing hygiene reads as a professionalism signal.

---

## 10. Screens

| Route | Purpose |
|---|---|
| `/` | Marketing page + prominent "Explore a demo garden" |
| `/today` | The daily driver. Habit list, check-off, tiny garden preview |
| `/garden` | Full garden, plot switcher, timeline scrubber |
| `/habits` | CRUD, schedule editor, archive |
| `/species` | Collection page — unlocked and silhouetted-locked |
| `/stats` | Streak history, heatmap, adherence over time |
| `/demo` | Statically generated, no auth |
| `/settings` | Timezone, notifications, account |

`/today` is the screen that gets opened 95% of the time. Optimize it ruthlessly: fast, one-thumb reachable, no navigation required to check off a habit.

---

## 11. Build phases

### P1 — Foundation
Next.js 15, Prisma, Neon, Auth.js v5, Tailwind v4. **Complete schema in a single initial migration.** Timezone capture at signup. CI with drift check.

### P2 — Habits core
CRUD, schedule mask editor, `/today` view, check-off via Server Action with `useOptimistic`. No garden yet.

### P3 — Ledger and streaks
Rollup write path inside the completion transaction. Recompute job. Schedule-aware streak query. Grace day logic. **Heavy unit testing here.**

### P4 — Placement engine
Seeded spiral ordering, feature slots, species weighting, tile unlock thresholds. Pure logic, no rendering. Property-tested: same seed plus same history must always produce the same garden.

### P5 — Garden render
Sprite sheet integration, CSS grid, layered tiles, species catalog. Static plants reflecting real derived state.

### P6 — Growth and life
Stage advancement, wilting tiers, achievement evaluation inside the rollup backfill, unlock feed, seasons and weather overlay, animations.

### P7 — Demo and share
Seed script for a realistic 120-day history, `next/og` share card, timeline scrubber, plot expansion.

### P8 — Polish
Empty states, mobile layout, a11y pass on the grid, Lighthouse, README with a GIF at the top.

> **Ship P1–P5 before touching P6.** A grid of static plants correctly reflecting real data is a working product. Animations layered over broken streak math are not.

---

## 12. Testing plan

The streak and rollup logic is the hardest code in the app and the least visually obvious when it breaks. It's also what makes the repo read as engineering rather than a CRUD demo.

**Date and streak cases:**
- Month and year boundaries
- DST spring-forward and fall-back
- User changes timezone mid-streak
- User travels across the date line
- Mon/Wed/Fri habit does not break on Tuesday
- Grace day consumption and monthly reset
- Habit archived mid-streak

**Placement engine (property tests):**
- Same seed + same history → identical garden, always
- Different seeds → different layouts
- New tile unlock never mutates an existing tile
- Feature slots only ever receive rare or legendary species

**Rollup integrity:**
- Full recompute from `Completion` reproduces stored `DayRollup` exactly
- Achievement re-evaluation after recompute is idempotent

---

## 13. Portfolio considerations

### 13.1 The empty garden problem

A habit tracker is empty on first load. A recruiter opens the link, sees bare dirt and an "add your first habit" prompt, and closes the tab. **The entire premise of the app is invisible in the first ten seconds.**

**Demo mode is a P1-priority feature, not a nice-to-have.** A prominent "Explore a demo garden" button loads a seeded 120-day history: strong early streaks, a two-week slump, a recovery. That arc is the story the app tells, and it's only visible with history behind it.

Because growth is derived, this is a seed script plus a rollup recompute. Nothing more.

### 13.2 Cold start

Neon's free tier suspends idle databases; cold starts run a few hundred milliseconds to a couple of seconds. For a project opened once, that first paint is the only impression.

- Make `/demo` statically generated with `revalidate`, so it renders instantly off the CDN and never touches a cold database
- A GitHub Actions scheduled ping keeps the connection warm (free on public repos)

### 13.3 Two cheap wins

**Share card** via `next/og` at `/g/[username]/opengraph-image`. Pasting your link into Slack and getting a rendered pixel garden preview is genuinely impressive and takes an afternoon.

**Timeline scrubber.** Drag through 90 days and watch the garden grow and wilt. Nearly free given derived state, and it's the thing people will screenshot.

### 13.4 README

Lead with a GIF of the scrubber. Then: the derived-state architecture in three sentences, the timezone correctness section, the placement algorithm, the test suite. Reviewers who read past the GIF are reading for engineering judgment, so put the interesting decisions where they'll find them.

---

## 14. Free-tier constraints

Every dependency must be free. Verify current limits on each provider's pricing page before committing — these change.

| Item | Free | Catch |
|---|---|---|
| Next.js, Prisma, Tailwind, Auth.js, Zod, Vitest, date-fns | Yes | MIT, no limits |
| Vercel Hobby | Yes | **Non-commercial only.** Cron capped at 2 jobs / daily |
| Neon free tier | Yes | Storage cap, autosuspend, compute-hour limit |
| GitHub + Google OAuth | Yes | None |
| `next/og` | Yes | Uses included edge function quota |
| GitHub Actions (public repo) | Yes | Scheduled workflows disable after 60 days idle |
| Kenney.nl sprites | Yes | CC0, attribution optional |
| `*.vercel.app` subdomain | Yes | Custom domain costs money — skip it |

### 14.1 Design consequences

**No email provider.** Magic-link auth needs one, and free email tiers generally only send to your own verified address unless you own a domain. GitHub + Google OAuth covers sign-in at zero cost and zero friction. For a portfolio piece aimed at developers, GitHub sign-in is the better default anyway.

**No scheduler.** See §8.3 — rollups evaluate lazily on read.

**Stay on Neon.** Supabase's free tier looks competitive but *pauses* projects after a week of inactivity and needs a manual restore. For a project a reviewer might open four months from now, that's a dead link. Neon's autosuspend resumes automatically. A slow cold start beats a broken one.

**Sprite packs.** Kenney is CC0 and safe. Paid itch.io packs (Sprout Lands, LimeZu) often have free subsets — use those, and check the license before shipping publicly.

**If it ever gets real users.** Vercel Hobby prohibits commercial use. Monetizing means moving to Pro.

---

## 15. Open questions

**Counters vs binary check-offs.** `targetPerDay` implies counters ("drink 8 glasses"); `scheduleMask` implies binary. Supporting both is fine, but ratio math gets murky: is 5 of 8 glasses a 0.625 day, or a partial success on one habit among four?

*Recommendation:* define `ratio` as the mean of per-habit fractional completion, each capped at 1.0. Handles both cleanly, and it's a two-line change to the rollup query.

**Notifications.** Web push is the obvious motivator but adds service worker complexity and a permissions flow that hurts first-run conversion. Defer past P8.

**Social.** Comparing gardens with friends is the natural expansion but doubles the scope. Keep the share card as the social surface for v1.
