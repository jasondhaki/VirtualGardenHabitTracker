import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Habit Garden",
  description: "A habit tracker where completed habits grow a shared pixel-art garden.",
};

/**
 * Deliberately auth-free: `auth()` reads `cookies()` (a Next.js Dynamic API)
 * and, with the database session strategy, is a real Postgres round trip.
 * Putting it here would make every route in the app — including `/demo`,
 * which must stay static and never touch the database — request-time only.
 * Authenticated routes get their own header/timezone-sync via `app/(app)/layout.tsx`.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
