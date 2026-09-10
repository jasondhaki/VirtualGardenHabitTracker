import type { Season } from "@/lib/dates";
import type { WiltTier } from "@/lib/growth/wilt";

/**
 * z3 season/weather layer (build plan §9.2). Purely decorative CSS — no new
 * art assets — so it never has to know anything about individual tiles.
 * Weather reads off the same garden-wide wilt tier the plants themselves
 * react to (build plan §3.4): a thriving/healthy garden reads as sunny, a
 * drooping/dormant one as rainy.
 */
const SUNNY_TIERS = new Set<WiltTier>(["thriving", "healthy"]);

export function GardenWeatherOverlay({ season, wiltTier }: { season: Season; wiltTier: WiltTier }) {
  const weather = SUNNY_TIERS.has(wiltTier) ? "sunny" : "rain";

  return (
    <div className={`garden-overlay garden-overlay--${season}`} aria-hidden>
      <div className={`garden-overlay__weather garden-overlay__weather--${weather}`} />
    </div>
  );
}
