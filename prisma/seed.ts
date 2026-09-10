import { PrismaClient } from "@prisma/client";
import { SPECIES_CATALOG } from "@/lib/garden/catalog";

const db = new PrismaClient();

/**
 * Upsert the species catalog by `key` so re-running this after adding a
 * species (no migration required — CLAUDE.md: "Achievements live in code")
 * never duplicates existing rows or disturbs tiles already assigned to them.
 */
async function main() {
  for (const species of SPECIES_CATALOG) {
    await db.species.upsert({
      where: { key: species.key },
      update: {
        name: species.name,
        rarity: species.rarity,
        unlockKind: species.unlockKind,
        unlockAtPoints: species.unlockAtPoints,
        achievementKey: species.achievementKey,
        spriteKey: species.spriteKey,
      },
      create: species,
    });
  }

  console.log(`Seeded ${SPECIES_CATALOG.length} species.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
