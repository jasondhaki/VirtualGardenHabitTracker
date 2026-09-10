import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { randomInt } from "crypto";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "database" },
  providers: [GitHub, Google],
  callbacks: {
    async session({ session, user }) {
      const dbUser = await db.user.findUnique({
        where: { id: user.id },
        select: { timezone: true, gardenSeed: true, currentPlotCount: true },
      });
      session.user.id = user.id;
      session.user.timezone = dbUser?.timezone ?? "UTC";
      session.user.gardenSeed = dbUser?.gardenSeed ?? 0;
      session.user.currentPlotCount = dbUser?.currentPlotCount ?? 1;
      return session;
    },
  },
  events: {
    // Auth.js's PrismaAdapter has no concept of gardenSeed — it only knows
    // id/name/email/image. Generate the real seed here, once, right after
    // the row is created. Never Math.random(): this seed feeds the
    // placement engine, which must be reproducible from stored state alone.
    async createUser({ user }) {
      const gardenSeed = randomInt(0, 2147483647);
      await db.user.update({
        where: { id: user.id },
        data: { gardenSeed },
      });
    },
  },
});
