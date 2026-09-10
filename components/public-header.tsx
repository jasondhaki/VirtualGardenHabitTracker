import Link from "next/link";

/**
 * Header for routes outside `app/(app)` — `/` and `/demo`. No `auth()` call:
 * `/demo` must stay static and never touch the database, so this
 * deliberately doesn't try to show a signed-in state (see `SiteHeader` for
 * the authenticated equivalent).
 */
export function PublicHeader() {
  return (
    <header className="flex items-center justify-between border-b border-gray-200 px-6 py-3">
      <Link href="/" className="font-semibold">
        Habit Garden
      </Link>
      <Link href="/sign-in" className="text-sm underline">
        Sign in
      </Link>
    </header>
  );
}
