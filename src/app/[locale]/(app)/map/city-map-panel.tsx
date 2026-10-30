"use client";

import type { RequestStatus } from "@prisma/client";
import { Info, MapPin, Navigation } from "lucide-react";
import { motion } from "motion/react";
import { useId, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { CityMap, type CityMapPlace } from "@/components/map";
import { useCityPresence } from "@/components/presence";
import { RequestStatusBadge } from "@/components/request-status-badge";
import { EmptyState } from "@/components/page";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { cityOf, type City } from "@/lib/cities";
import { spring } from "@/lib/motion";
import type { CityPerson } from "@/lib/presence";
import { cn } from "@/lib/utils";
import { SimulationToggle } from "../_simulation/simulation-toggle";

export type ClientPlace = CityMapPlace & {
  city: string | null;
  requests: {
    id: string;
    title: string;
    status: RequestStatus;
    assignee: string | null;
  }[];
};

type Props = {
  isAdmin: boolean;
  office: CityMapPlace;
  clients: ClientPlace[];
  cities: City[];
  timezone: string;
};

export function CityMapPanel({ isAdmin, office, clients, cities, timezone }: Props) {
  const t = useTranslations();
  const format = useFormatter();
  const { data } = useCityPresence();
  const people = data?.people ?? [];
  const tracked = data?.tracked ?? [];
  const pillId = useId();
  const [cityId, setCityId] = useState(cities[0]?.id);
  const city = cities.find((c) => c.id === cityId) ?? cities[0];

  const time = (iso: string | null) =>
    iso
      ? format.dateTime(new Date(iso), {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: timezone,
        })
      : "—";
  const reasonText = (p: CityPerson) => (p.reason ? t(`exitReason.${p.reason}`) : t("status.OUT_OF_OFFICE"));
  const peopleIn = (c: City) => people.filter((p) => cityOf(cities, p).id === c.id);
  const shown = city ? peopleIn(city) : people;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_400px] min-[2200px]:grid-cols-[minmax(0,1fr)_520px]">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* City switcher: only when the points are in different cities. */}
          {cities.length > 1 && (
            <div
              className="inset-well flex max-w-full gap-0.5 overflow-x-auto rounded-xl p-[3px]"
              role="tablist"
              data-testid="city-switcher"
            >
              {cities.map((c) => {
                const count = peopleIn(c).length;
                const active = c.id === city?.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setCityId(c.id)}
                    className={cn(
                      "relative flex h-8 shrink-0 items-center gap-1.5 rounded-[9px] px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                      active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId={`city-${pillId}`}
                        transition={spring.snappy}
                        className="lens absolute inset-0 rounded-[9px] bg-card shadow-[0_1px_2px_rgb(0_0_0/.1),0_2px_6px_-2px_rgb(0_0_0/.12),inset_0_1px_0_var(--glass-hi)]"
                      />
                    )}
                    <span className="relative">{c.label}</span>
                    {count > 0 && (
                      <span className="nums relative rounded-full bg-sig-out/15 px-1.5 text-xs leading-5 text-sig-out">{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {isAdmin && (
            <div className="ml-auto">
              <SimulationToggle enabled={!!data?.simulation} />
            </div>
          )}
        </div>
        <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          {t("map.hint")}
        </p>
        <div className="glass rounded-[1.4rem] p-1.5">
          <div className="relative isolate h-[max(480px,calc(100dvh-15rem))] overflow-hidden rounded-2xl max-sm:h-[62vh]" data-testid="city-map">
            <CityMap
              bounds={city?.bounds}
              office={office}
              clients={clients.filter((c) => !c.requests.length)}
              requests={clients
                .filter((c) => c.requests.length)
                .map((c) => ({
                  ...c,
                  popup: (
                    <div className="grid min-w-48 gap-1.5">
                      <div className="font-medium">{c.label}</div>
                      {c.requests.map((r) => (
                        <div key={r.id} className="grid gap-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <span>{r.title}</span>
                            <RequestStatusBadge status={r.status} />
                          </div>
                          <div className="text-xs text-muted-foreground">{r.assignee ?? t("map.noAssignee")}</div>
                        </div>
                      ))}
                    </div>
                  ),
                }))}
              people={people.map((p) => ({
                ...p,
                popup: (
                  <div className="grid gap-0.5" data-testid="person-popup">
                    <div className="font-medium">{p.name}</div>
                    <div>{[reasonText(p), p.requestTitle].filter(Boolean).join(" · ")}</div>
                    <div className="text-muted-foreground">{t("map.wentOut", { time: time(p.exitAt) })}</div>
                  </div>
                ),
              }))}
            />
            <Legend />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:sticky lg:top-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {t("map.outside")}
            <span className="nums ml-2 text-muted-foreground">{shown.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {shown.length === 0 ? (
            <EmptyState icon={MapPin} text={t("map.nobody")} className="py-6" />
          ) : (
            <ul className="grid gap-3" data-testid="city-people">
              {shown.map((p) => (
                <li key={p.id} className="flex gap-3">
                  <Avatar id={p.id} name={p.name} size="sm" status="out" className="mt-0.5" />
                  <div className="min-w-0">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-muted-foreground">{[reasonText(p), p.requestTitle].filter(Boolean).join(" · ")}</div>
                    <div className="nums text-xs text-muted-foreground">{t("map.wentOut", { time: time(p.exitAt) })}</div>
                    {p.trackByPhone && (
                      <Link href={`/track/${p.id}`} className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                        <Navigation className="size-3" />
                        {t("track.follow")}
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      {/* Tracked people are here in any status: "Outside" would miss someone who has just checked in. */}
      {tracked.length > 0 && (
        <Card data-testid="tracked-people">
          <CardHeader>
            <CardTitle>{t("track.listTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <ul className="grid gap-3">
              {tracked.map((p) => (
                <li key={p.id} className="flex items-center gap-3">
                  <Avatar id={p.id} name={p.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{t(`status.${p.status}`)}</div>
                  </div>
                  <Link href={`/track/${p.id}`} className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline">
                    <Navigation className="size-3" />
                    {t("track.follow")}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}

function Legend() {
  const t = useTranslations("map");
  const items = [
    ["size-3 bg-primary ring-2 ring-primary/25", t("legendOffice")],
    ["size-2.5 bg-sig-info ring-2 ring-white/90", t("legendRequest")],
    ["size-3 bg-[oklch(0.9_0.05_200)] ring-2 ring-sig-out", t("legendPerson")],
    ["size-2 bg-card ring-2 ring-sig-off", t("legendClient")],
  ];
  return (
    <div className="glass pointer-events-none absolute bottom-6 left-3 z-[400] grid gap-1.5 rounded-xl px-3 py-2.5 text-xs">
      {items.map(([dot, label]) => (
        <div key={label} className="flex items-center gap-2">
          <span className="flex w-3 justify-center">
            <span className={cn("rounded-full", dot)} />
          </span>
          {label}
        </div>
      ))}
    </div>
  );
}
