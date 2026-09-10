/**
 * Sprite sheet geometry (build plan §9.1 — one sheet, `background-position`
 * per tile, `image-rendering: pixelated`, no `<img>` per tile). The sheet
 * itself lives at `public/sprites/plants.svg`, laid out as a fixed 5x4 grid.
 *
 * `SPRITE_ORDER` is append-only: a stored `Species.spriteKey` points at a
 * position in this list, so reordering or removing an entry would silently
 * repaint every garden that already unlocked that species.
 */

export const SPRITE_SHEET_URL = "/sprites/plants.svg";
export const SPRITE_CELL_SIZE = 32;
export const SPRITE_SHEET_COLS = 5;
export const SPRITE_SHEET_ROWS = 4;

const SPRITE_ORDER = [
  "clover",
  "daisy",
  "marigold",
  "lavender",
  "sunflower",
  "fern",
  "tulip",
  "bamboo",
  "wisteria",
  "maple-sapling",
  "cherry-blossom",
  "first-sprout",
  "dew-orchid",
  "moonflower",
  "phoenix-lily",
  "sunrise-poppy",
  "ironwood",
  "rainbow-canopy",
  "world-tree",
] as const;

export type SpriteKey = (typeof SPRITE_ORDER)[number];

const SPRITE_INDEX: ReadonlyMap<string, number> = new Map(SPRITE_ORDER.map((key, index) => [key, index]));

export interface SpriteBackground {
  backgroundImage: string;
  backgroundSize: string;
  backgroundPosition: string;
}

/**
 * CSS background properties that render `spriteKey` scaled to `displayPx`
 * per tile. Falls back to sprite index 0 for an unrecognized key rather than
 * throwing — a render path should never hard-fail over cosmetic data.
 */
export function spriteBackground(spriteKey: string, displayPx: number): SpriteBackground {
  const index = SPRITE_INDEX.get(spriteKey) ?? 0;
  const col = index % SPRITE_SHEET_COLS;
  const row = Math.floor(index / SPRITE_SHEET_COLS);
  const scale = displayPx / SPRITE_CELL_SIZE;

  return {
    backgroundImage: `url(${SPRITE_SHEET_URL})`,
    backgroundSize: `${SPRITE_SHEET_COLS * SPRITE_CELL_SIZE * scale}px ${SPRITE_SHEET_ROWS * SPRITE_CELL_SIZE * scale}px`,
    backgroundPosition: `${-col * displayPx}px ${-row * displayPx}px`,
  };
}
