"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useOfficePresence } from "@/components/presence";
import { Avatar } from "@/components/ui/avatar";

export type MiniMapZone = { id: string; name: string; x: number; y: number; width: number; height: number };

type Props = { imageUrl: string; zones: MiniMapZone[]; timezone: string };

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
      <img src={imageUrl} alt={t("officePlan.title")} className="block h-auto w-full rounded-xl border border-border/70 bg-white dark:brightness-[.86] dark:contrast-[.95]" draggable={false} />
      <div className="absolute inset-0">
        {zones.map((z) => (
          <div
            key={z.id}
            className="pointer-events-none absolute rounded-md border border-dashed border-sig-off/40 bg-sig-off/[.04]"
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
              className="block cursor-pointer rounded-full shadow-[0_2px_6px_-1px_rgb(0_0_0/.35)] ring-2 ring-white [transition:transform_.4s_var(--ease-spring)] group-hover:scale-125 focus:scale-125 focus:outline-none dark:ring-white/80"
            >
              <Avatar id={p.id} name={p.name} size="xs" />
            </span>
            {/* Hover card: name, desk or zone, time of the last mark. */}
            <div className="pointer-events-none invisible absolute bottom-full left-1/2 mb-2 w-max max-w-56 -translate-x-1/2 glass-overlay translate-y-1 rounded-xl px-3 py-2 text-xs text-popover-foreground opacity-0 [transition:opacity_.2s,translate_.35s_var(--ease-spring)] group-hover:translate-y-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
              <div className="flex items-center gap-1.5 font-medium">
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
          <span className="glass rounded-full px-4 py-2 text-sm text-muted-foreground">{t("dashboard.nobodyInOffice")}</span>
        </div>
      )}
    </div>
  );
}
