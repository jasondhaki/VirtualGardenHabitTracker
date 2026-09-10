import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { TimelineScrubber } from "@/components/garden/timeline-scrubber";
import { buildDemoGarden } from "@/lib/demo/build";

// Renders off the CDN and never touches the database (CLAUDE.md: "/demo ...
// STATIC. must never touch the database") — everything on this page comes
// from the pure, DB-free `lib/demo/build.ts` pipeline. Revalidating hourly
// keeps the 120-day window anchored close to "now" without recomputing on
// every request.
export const revalidate = 3600;

export default function DemoPage() {
  const garden = buildDemoGarden();

  return (
    <>
      <PublicHeader />
      <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Demo garden</h1>
          <p className="text-sm text-gray-500">
            120 days of a seeded history — strong early streaks, a two-week slump, a recovery. Drag the slider below
            to watch it grow and wilt.{" "}
            <Link href="/sign-in" className="underline">
              Start your own
            </Link>
            .
          </p>
        </div>

        <TimelineScrubber snapshots={garden.snapshots} />
      </main>
    </>
  );
}
