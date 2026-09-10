"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const setTimezoneSchema = z.object({
  timezone: z.string().min(1).max(100),
});

/**
 * Called once client-side right after signup (and reusable from Settings
 * for a manual override). The client is the only place that can observe
 * Intl.DateTimeFormat().resolvedOptions().timeZone; the server never
 * derives "today" without this value being persisted first.
 */
export async function setTimezone(input: { timezone: string }) {
  const { timezone } = setTimezoneSchema.parse(input);

  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  if (session.user.timezone === timezone) {
    return { updated: false };
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { timezone },
  });

  return { updated: true };
}
