import { describe, expect, it } from "vitest";
import { spriteBackground, SPRITE_CELL_SIZE, SPRITE_SHEET_COLS } from "./sprites";

describe("spriteBackground", () => {
  it("positions the first sprite (clover) at the sheet origin", () => {
    const bg = spriteBackground("clover", SPRITE_CELL_SIZE);
    expect(bg.backgroundPosition).toBe("0px 0px");
  });

  it("offsets a later sprite by its column and row", () => {
    // "fern" is index 5: col 0, row 1 in a 5-column sheet.
    const bg = spriteBackground("fern", SPRITE_CELL_SIZE);
    expect(bg.backgroundPosition).toBe("0px -32px");
  });

  it("scales offsets proportionally when displayed larger than the native cell", () => {
    const bg = spriteBackground("marigold", SPRITE_CELL_SIZE * 2); // index 2: col 2, row 0
    expect(bg.backgroundPosition).toBe(`${-2 * SPRITE_CELL_SIZE * 2}px 0px`);
    expect(bg.backgroundSize).toContain(`${SPRITE_SHEET_COLS * SPRITE_CELL_SIZE * 2}px`);
  });

  it("falls back to index 0 for an unrecognized key instead of throwing", () => {
    expect(() => spriteBackground("not-a-real-species", SPRITE_CELL_SIZE)).not.toThrow();
    expect(spriteBackground("not-a-real-species", SPRITE_CELL_SIZE).backgroundPosition).toBe("0px 0px");
  });
});
