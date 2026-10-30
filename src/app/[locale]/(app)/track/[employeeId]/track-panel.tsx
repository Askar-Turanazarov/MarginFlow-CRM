"use client";

import { AlertTriangle, Crosshair } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { TrackMap } from "@/components/map";
import { useTrack } from "@/components/presence";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { TrackData } from "@/lib/track";
import { cn } from "@/lib/utils";

/** No new point for this long → the viewer is warned that the phone has gone quiet. */
const STALE_AFTER_MS = 60_000;

const STATUS_TONE = {
  IN_OFFICE: "bg-sig-in/12 text-sig-in",
  OUT_OF_OFFICE: "bg-sig-out/12 text-sig-out",
  OFF_DUTY: "bg-sig-off/12 text-sig-off",
} as const;

type Props = {
  employeeId: string;
  initial: TrackData;
  timezone: string;
  center: { lat: number; lng: number };
};

export function TrackPanel({ employeeId, initial, timezone, center }: Props) {
  const t = useTranslations();
  const format = useFormatter();
  const { data, dataUpdatedAt } = useTrack(employeeId, initial);
  const track = data ?? initial;
  const [follow, setFollow] = useState(true);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  const time = (iso: string) => format.dateTime(new Date(iso), { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: timezone });
  // Counted from the server's answer, so the viewer's clock does not matter.
  const ageMs = track.lastAgeMs === null ? null : track.lastAgeMs + Math.max(0, (now || dataUpdatedAt) - dataUpdatedAt);
  const stale = ageMs !== null && ageMs > STALE_AFTER_MS && track.status !== "OFF_DUTY";

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="glass rounded-[1.4rem] p-1.5">
        <div className="relative isolate h-[max(480px,calc(100dvh-13rem))] overflow-hidden rounded-2xl max-sm:h-[62vh]" data-testid="track-map">
          <TrackMap
            personId={track.id}
            initials={track.initials}
            name={track.name}
            center={center}
            path={track.path}
            last={track.last}
            checkInLabel={t("track.checkInPoint")}
            follow={follow}
            onManualMove={() => setFollow(false)}
          />
          {!track.last && (
            <div className="pointer-events-none absolute inset-0 z-[400] flex items-center justify-center p-4">
              <span className="glass rounded-full px-4 py-2 text-center text-sm text-muted-foreground" data-testid="track-empty">
                {t("track.noPoints")}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:sticky lg:top-6">
        <Card>
          <CardContent className="grid gap-4 pt-5 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={cn("rounded-full px-3 py-1 font-medium", STATUS_TONE[track.status])} data-testid="track-status">
                {t(`status.${track.status}`)}
              </span>
              <span className={cn("nums text-xs", stale ? "font-medium text-sig-late" : "text-muted-foreground")} data-testid="track-age">
                {stale && <AlertTriangle className="mr-1 inline size-3.5" />}
                {ageMs === null ? t("track.neverUpdated") : t("track.updatedAgo", { seconds: Math.round(ageMs / 1000) })}
              </span>
            </div>
            {stale && <p className="rounded-xl bg-sig-late/8 px-3 py-2 text-xs text-sig-late">{t("track.stale")}</p>}

            <dl className="grid grid-cols-3 gap-3">
              <Stat label={t("track.distance")} value={t("track.km", { value: (track.distanceM / 1000).toFixed(2) })} testId="track-distance" />
              <Stat label={t("track.speed")} value={track.speedKmh === null ? "—" : t("track.kmh", { value: track.speedKmh.toFixed(1) })} />
              <Stat
                label={t("track.checkIn")}
                value={track.checkInAt ? format.dateTime(new Date(track.checkInAt), { hour: "2-digit", minute: "2-digit", timeZone: timezone }) : "—"}
              />
            </dl>
            {track.last && <p className="nums text-xs text-muted-foreground">{t("track.accuracy", { meters: Math.round(track.last.accuracy) })}</p>}

            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-foreground/[.03] px-4 py-3">
              <span className="flex items-center gap-2">
                <Crosshair className="size-4 text-muted-foreground" />
                {t("track.follow")}
              </span>
              <Switch checked={follow} onCheckedChange={setFollow} data-testid="track-follow" />
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("track.events")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {track.events.length === 0 ? (
              <p className="text-muted-foreground">{t("track.noEvents")}</p>
            ) : (
              <ol className="grid gap-2" data-testid="track-events">
                {track.events.map((e) => (
                  <li key={e.id} className="flex items-baseline justify-between gap-3">
                    <span>
                      {t(`track.event.${e.type}`)}
                      {e.reason && <span className="text-muted-foreground"> · {t(`exitReason.${e.reason}`)}</span>}
                    </span>
                    <span className="nums shrink-0 text-xs text-muted-foreground">{time(e.at)}</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="nums font-semibold" data-testid={testId}>
        {value}
      </dd>
    </div>
  );
}
