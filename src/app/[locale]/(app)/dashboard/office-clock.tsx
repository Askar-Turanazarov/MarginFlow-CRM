"use client";

import { formatInTimeZone } from "date-fns-tz";
import { useEffect, useState } from "react";

/** Office time that keeps ticking (the office is in another time zone than most visitors). */
export function OfficeClock({ timezone, initial }: { timezone: string; initial: string }) {
  const [time, setTime] = useState(initial);
  useEffect(() => {
    const id = setInterval(() => setTime(formatInTimeZone(new Date(), timezone, "HH:mm")), 10_000);
    return () => clearInterval(id);
  }, [timezone]);
  return <span className="font-mono text-foreground">{time}</span>;
}
