"use client";

import { useMemo, useState } from "react";
import type { DaySnapshot } from "@/lib/garden/snapshots";
import { GardenPlot } from "./garden-plot";

/**
 * Drag through history and watch the garden grow and wilt (build plan §13.3
 * — "nearly free given derived state"). `snapshots` is fully precomputed
 * server-side (or, for `/demo`, at build time) via `buildDailySnapshots` —
 * every frame of scrubbing here is a pure client-side array lookup, no
 * network round trip, no re-derivation.
 */
export function TimelineScrubber({ snapshots }: { snapshots: DaySnapshot[] }) {
  const lastIndex = snapshots.length - 1;
  const [dayIndex, setDayIndex] = useState(lastIndex);
  const [plotIndex, setPlotIndex] = useState(0);

  const day = snapshots[dayIndex];
  const isToday = dayIndex === lastIndex;
  const plotCount = day.plots.length;
  const activePlot = useMemo(() => day.plots[Math.min(plotIndex, plotCount - 1)], [day, plotIndex, plotCount]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between text-sm text-gray-500">
        <span>{isToday ? "Today" : day.localDate}</span>
        <span>{day.totalPoints} points</span>
      </div>

      <GardenPlot model={activePlot} wiltTier={day.wiltTier} season={day.season} />

      {plotCount > 1 ? (
        <div className="flex gap-2 text-sm">
          {day.plots.map((plot, index) => (
            <button
              key={plot.plotIndex}
              type="button"
              onClick={() => setPlotIndex(index)}
              className={index === Math.min(plotIndex, plotCount - 1) ? "font-semibold underline" : "text-gray-500 underline"}
            >
              Plot {plot.plotIndex}
            </button>
          ))}
        </div>
      ) : null}

      <input
        type="range"
        min={0}
        max={lastIndex}
        value={dayIndex}
        onChange={(event) => setDayIndex(Number(event.target.value))}
        aria-label="Scrub through garden history"
        className="w-full"
      />
      <div className="flex justify-between text-xs text-gray-400">
        <span>{snapshots[0].localDate}</span>
        <span>{snapshots[lastIndex].localDate}</span>
      </div>
    </div>
  );
}
