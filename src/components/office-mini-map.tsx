"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useOfficePresence } from "@/components/presence";
import { cn } from "@/lib/utils";

export type MiniMapZone = { id: string; name: string; x: number; y: number; width: number; height: number };

type Props = { imageUrl: string; zones: MiniMapZone[]; timezone: string };

// Each person keeps the same colour on every refresh (picked by id).
const DOT_COLORS = [
  "bg-sky-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-teal-500",
  "bg-fuchsia-500",
  "bg-indigo-500",
  "bg-lime-600",
  "bg-orange-500",
];
const colorOf = (id: string) => DOT_COLORS[[...id].reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) >>> 0, 7) % DOT_COLORS.length];

/**
 * Read-only office plan with everyone who is in the office now (refreshes every 3 s).
 * People outside the office are never drawn here — they are on the city map.
 */
export function OfficeMiniMap({ imageUrl, zones, timezone }: Props) {
  const t = useTranslations();
  const format = useFormatter();
  const { data } = useOfficePresence();
  const people = data?.office ?? [];
  const time = (iso: string | null) => (iso ? format.dateTime(new Date(iso), { hour: "2-digit", minute: "2-digit", timeZone: timezone }) : "—");

  return (
    <div className="relative select-none" data-testid="mini-map">
      {/* eslint-disable-next-line @next/next/no-img-element -- plain image: served from our API with auth */}
      <img src={imageUrl} alt={t("officePlan.title")} className="block h-auto w-full rounded-lg border bg-white" draggable={false} />
      <div className="absolute inset-0">
        {zones.map((z) => (
          <div
            key={z.id}
            className="pointer-events-none absolute rounded-md border border-dashed border-slate-400/60 bg-slate-400/5"
            style={{ left: `${z.x * 100}%`, top: `${z.y * 100}%`, width: `${z.width * 100}%`, height: `${z.height * 100}%` }}
          />
        ))}
        {people.map((p) => (
          <div
            key={p.id}
            data-testid="mini-person"
            className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-[2800ms] ease-linear hover:z-30"
            style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
          >
            <span
              tabIndex={0}
              aria-label={p.name}
              className={cn(
                "block size-3.5 cursor-pointer rounded-full border-2 border-white shadow-md ring-1 ring-black/10 transition-transform group-hover:scale-150 focus:scale-150 focus:outline-none",
                colorOf(p.id),
              )}
            />
            {/* Hover card: name, desk or zone, time of the last mark. */}
            <div className="pointer-events-none invisible absolute bottom-full left-1/2 mb-2 w-max max-w-56 -translate-x-1/2 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
              <div className="flex items-center gap-1.5 font-medium">
                <span className={cn("size-2 rounded-full", colorOf(p.id))} />
                {p.name}
              </div>
              <div className="mt-0.5 text-muted-foreground">
                {p.zone ?? (p.desk ? t("dashboard.atDesk", { desk: p.desk }) : t("dashboard.noDeskShort"))}
              </div>
              <div className="text-muted-foreground">{t("dashboard.lastMark", { time: time(p.lastMarkAt) })}</div>
            </div>
          </div>
        ))}
      </div>
      {people.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="rounded-md bg-background/90 px-3 py-1.5 text-sm text-muted-foreground shadow">{t("dashboard.nobodyInOffice")}</span>
        </div>
      )}
    </div>
  );
}
