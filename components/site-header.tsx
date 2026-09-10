import Link from "next/link";
import { auth, signOut } from "@/auth";

export async function SiteHeader() {
  const session = await auth();

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-gray-200 px-4 py-3 sm:px-6">
      <Link href="/" className="font-semibold">
        Habit Garden
      </Link>
      {session?.user ? (
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <Link href="/today">Today</Link>
          <Link href="/garden">Garden</Link>
          <Link href="/habits">Habits</Link>
          <form
            action={async () => {
              "use server";
              await signOut();
            }}
          >
            <button type="submit" className="text-gray-500 underline">
              Sign out
            </button>
          </form>
        </nav>
      ) : (
        <Link href="/sign-in" className="text-sm underline">
          Sign in
        </Link>
      )}
    </header>
  );
}
