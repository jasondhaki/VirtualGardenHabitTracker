export interface UnlockFeedEntry {
  key: string;
  name: string;
  description: string;
  earnedOnDate: string;
  isNew: boolean;
}

/**
 * Recent achievement unlocks (build plan §11 P6 — "unlock feed"). Achievements
 * are earned once and never revoked (CLAUDE.md invariant #1), so this is
 * purely a read of `AchievementUnlock` — nothing here is stateful beyond
 * `isNew`, which just flags rows earned during the request that rendered
 * this page.
 */
export function UnlockFeed({ entries }: { entries: UnlockFeedEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-gray-700">Recent unlocks</h2>
      <ul className="flex flex-col gap-2">
        {entries.map((entry) => (
          <li
            key={entry.key}
            className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
              entry.isNew ? "border-amber-400 bg-amber-50" : "border-gray-200 bg-white"
            }`}
          >
            <span>
              <span className="font-medium">{entry.name}</span>
              <span className="text-gray-500"> — {entry.description}</span>
            </span>
            {entry.isNew ? <span className="ml-2 shrink-0 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-semibold text-amber-950">New</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
