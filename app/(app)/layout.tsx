import { auth } from "@/auth";
import { TimezoneSync } from "@/components/timezone-sync";
import { SiteHeader } from "@/components/site-header";

/**
 * Shell for every authenticated route (`/today`, `/garden`, `/habits`, ...).
 * `auth()` reads `cookies()` — a Next.js Dynamic API — so anything under this
 * layout is request-time, never statically prerendered. That's fine for
 * these routes but is exactly why `/demo` (must stay static, must never
 * touch the database — see CLAUDE.md) lives outside this group entirely.
 */
export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <>
      {session?.user ? <TimezoneSync /> : null}
      <SiteHeader />
      {children}
    </>
  );
}
