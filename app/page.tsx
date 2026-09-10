import Link from "next/link";
import { PublicHeader } from "@/components/public-header";

export default function Home() {
  return (
    <>
      <PublicHeader />
      <main className="flex min-h-[calc(100vh-57px)] flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-3xl font-semibold">Habit Garden</h1>
        <p className="max-w-sm text-sm text-gray-500">
          Complete habits, grow a pixel-art garden. Every plant reflects real history — nothing here is just for
          show.
        </p>
        <Link
          href="/demo"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
        >
          Explore a demo garden
        </Link>
      </main>
    </>
  );
}
