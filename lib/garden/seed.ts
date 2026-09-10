/**
 * Derive an independent-looking sub-seed from the user's `gardenSeed` plus a
 * salt (plot index, purpose tag, ...). Placement uses several PRNG streams
 * (per-plot ring jitter, global species selection) that must not correlate
 * with each other, while still being a pure function of the single stored
 * seed — never `Math.random()`, per CLAUDE.md invariant #5.
 */
export function deriveSeed(seed: number, salt: number): number {
  return Math.imul(seed ^ salt, 0x9e3779b1) | 0;
}
