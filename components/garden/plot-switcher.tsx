import Link from "next/link";

export function PlotSwitcher({ plotCount, activePlot }: { plotCount: number; activePlot: number }) {
  return (
    <nav className="flex gap-3 text-sm">
      {Array.from({ length: plotCount }, (_, i) => i + 1).map((plot) => (
        <Link
          key={plot}
          href={`/garden?plot=${plot}`}
          className={plot === activePlot ? "font-semibold underline" : "text-gray-500 underline"}
        >
          Plot {plot}
        </Link>
      ))}
    </nav>
  );
}
