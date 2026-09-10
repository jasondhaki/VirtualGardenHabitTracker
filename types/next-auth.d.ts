import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      timezone: string;
      gardenSeed: number;
      currentPlotCount: number;
    } & DefaultSession["user"];
  }
}
