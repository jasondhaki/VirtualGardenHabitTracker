import type { Metadata } from "next";
import "./globals.css";
import { auth } from "@/auth";
import { TimezoneSync } from "@/components/timezone-sync";

export const metadata: Metadata = {
  title: "Habit Garden",
  description: "A habit tracker where completed habits grow a shared pixel-art garden.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en">
      <body>
        {session?.user ? <TimezoneSync /> : null}
        {children}
      </body>
    </html>
  );
}
