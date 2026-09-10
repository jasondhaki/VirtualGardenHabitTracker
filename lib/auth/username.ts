import { randomInt } from "crypto";
import { PrismaClient, Prisma } from "@prisma/client";

type UsernameDbClient = PrismaClient | Prisma.TransactionClient;

const FALLBACK_SLUG = "gardener";
const MAX_COLLISION_ATTEMPTS = 5;

/**
 * Pure slug derivation from a signup seed (typically the email local-part).
 * Never throws — an all-symbol or non-Latin seed just falls back to a fixed
 * word rather than producing an empty username.
 */
export function slugifyUsername(seed: string): string {
  const slug = seed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20);
  return slug.length > 0 ? slug : FALLBACK_SLUG;
}

/**
 * Resolve a slug to a globally-unique `username`, appending a short random
 * suffix on collision. Uses `crypto.randomInt`, never `Math.random` — same
 * reasoning as the `gardenSeed` generation in `auth.ts`: nothing here is
 * placement-sensitive, but the codebase treats `Math.random` as banned by
 * default rather than case-by-case.
 */
export async function generateUniqueUsername(client: UsernameDbClient, seed: string): Promise<string> {
  const slug = slugifyUsername(seed);

  for (let attempt = 0; attempt < MAX_COLLISION_ATTEMPTS; attempt++) {
    const candidate = attempt === 0 ? slug : `${slug}-${randomInt(1000, 9999)}`;
    const existing = await client.user.findUnique({ where: { username: candidate }, select: { id: true } });
    if (!existing) return candidate;
  }

  // Astronomically unlikely with a 4-digit suffix space, but never loop forever.
  return `${slug}-${randomInt(100000, 999999)}`;
}
