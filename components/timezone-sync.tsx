"use client";

import { useEffect } from "react";
import { setTimezone } from "@/lib/actions/timezone";

/**
 * Mounted once for a signed-in user. The server can never guess a user's
 * timezone, and the client can never be trusted to resolve "today" itself
 * — so this exists purely to hand the browser's IANA timezone to the
 * server once, so every later date resolution stays server-side.
 */
export function TimezoneSync() {
  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    void setTimezone({ timezone });
  }, []);

  return null;
}
