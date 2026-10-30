"use client";

import { Loader2, LocateFixed, MapPinOff, Navigation } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const SEND_EVERY_MS = 10_000;
/** An older fix is not sent: the tracking page should show "no data", not a stale point as fresh. */
const MAX_FIX_AGE_MS = 60_000;
const STORAGE_KEY = "mf.phoneTracking";

type Problem = "denied" | "unavailable";

function remember(on: boolean) {
  try {
    if (on) localStorage.setItem(STORAGE_KEY, "on");
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

/**
 * For employees marked "Phone tracking": from check-in to the end of work the position goes to the server every 10 s.
 * Started by a tap, because iOS asks for permission only after a user action; the choice is remembered.
 * Rendered only during the open workday, and the server refuses points outside it anyway.
 */
export function PhoneTracking() {
  const t = useTranslations("tracking");
  const [enabled, setEnabled] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [fix, setFix] = useState<number | null>(null);
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const latest = useRef<GeolocationPosition | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "on") setEnabled(true);
    } catch {}
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (!("geolocation" in navigator)) {
      setProblem("unavailable");
      return;
    }

    const send = async () => {
      const position = latest.current;
      if (!position || Date.now() - position.timestamp > MAX_FIX_AGE_MS) return;
      const { latitude: lat, longitude: lng, accuracy } = position.coords;
      try {
        const res = await fetch("/api/positions", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ positions: [{ geo: { lat, lng, accuracy } }] }),
        });
        const result: { accepted?: number } = await res.json();
        if (result.accepted) setSentAt(Date.now());
      } catch {}
    };

    const watch = navigator.geolocation.watchPosition(
      (position) => {
        const first = !latest.current;
        latest.current = position;
        setFix(position.coords.accuracy);
        setProblem(null);
        if (first) void send();
      },
      (error) => setProblem(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable"),
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
    );
    const sender = setInterval(() => void send(), SEND_EVERY_MS);
    const clock = setInterval(() => setNow(Date.now()), 1_000);

    // Keep the screen on where the browser allows it: a sleeping phone stops geolocation.
    let lock: WakeLockSentinel | null = null;
    let stopped = false;
    const keepAwake = async () => {
      if (!("wakeLock" in navigator) || document.visibilityState !== "visible") return;
      try {
        const next = await navigator.wakeLock.request("screen");
        if (stopped) void next.release();
        else lock = next;
      } catch {}
    };
    void keepAwake();
    document.addEventListener("visibilitychange", keepAwake);

    return () => {
      stopped = true;
      navigator.geolocation.clearWatch(watch);
      clearInterval(sender);
      clearInterval(clock);
      document.removeEventListener("visibilitychange", keepAwake);
      void lock?.release();
      latest.current = null;
    };
  }, [enabled]);

  const toggle = (on: boolean) => {
    remember(on);
    setEnabled(on);
    setProblem(null);
    setFix(null);
    setSentAt(null);
  };

  if (!enabled) {
    return (
      <section className="surface mb-5 grid gap-4 rounded-2xl p-5 sm:flex sm:items-center" data-testid="tracking-card">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
          <Navigation className="size-5" />
        </span>
        <div className="grid flex-1 gap-1">
          <h2 className="font-semibold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("explain")}</p>
        </div>
        <Button size="lg" className="w-full sm:w-auto" onClick={() => toggle(true)} data-testid="tracking-enable">
          <LocateFixed />
          {t("enable")}
        </Button>
      </section>
    );
  }

  const agoSeconds = sentAt ? Math.max(0, Math.round(((now || sentAt) - sentAt) / 1000)) : null;
  return (
    <section className="surface mb-5 grid gap-3 rounded-2xl p-4 sm:flex sm:items-center" data-testid="tracking-on">
      <div className="grid flex-1 gap-1 text-sm">
        {problem ? (
          <p className="flex items-center gap-2 font-medium text-sig-late">
            <MapPinOff className="size-4 shrink-0" />
            {t(`problem.${problem}`)}
          </p>
        ) : (
          <p className="flex items-center gap-2 font-medium">
            {fix === null ? <Loader2 className="size-4 shrink-0 animate-spin" /> : <span className="size-2 shrink-0 rounded-full bg-sig-in" />}
            {fix === null ? t("waiting") : t("active")}
          </p>
        )}
        {!problem && fix !== null && (
          <p className="nums text-xs text-muted-foreground">
            {t("accuracy", { meters: Math.round(fix) })}
            {agoSeconds !== null && ` · ${t("sentAgo", { seconds: agoSeconds })}`}
          </p>
        )}
        <p className="text-xs text-muted-foreground">{t("keepOpen")}</p>
      </div>
      <Button variant="ghost" onClick={() => toggle(false)} data-testid="tracking-stop">
        {t("disable")}
      </Button>
    </section>
  );
}
