"use client";

import type { RequestStatus } from "@prisma/client";
import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { CityMap, type CityMapPlace } from "@/components/map";
import { useCityPresence } from "@/components/presence";
import { RequestStatusBadge } from "@/components/request-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cityOf, type City } from "@/lib/cities";
import type { CityPerson } from "@/lib/presence";
import { cn } from "@/lib/utils";
import { SimulationToggle } from "../_simulation/simulation-toggle";

export type ClientPlace = CityMapPlace & {
  city: string | null;
  requests: { id: string; title: string; status: RequestStatus; assignee: string | null }[];
};

type Props = { isAdmin: boolean; office: CityMapPlace; clients: ClientPlace[]; cities: City[]; timezone: string };

export function CityMapPanel({ isAdmin, office, clients, cities, timezone }: Props) {
  const t = useTranslations();
  const format = useFormatter();
  const { data } = useCityPresence();
  const people = data?.people ?? [];
  const [cityId, setCityId] = useState(cities[0]?.id);
  const city = cities.find((c) => c.id === cityId) ?? cities[0];

  const time = (iso: string | null) => (iso ? format.dateTime(new Date(iso), { hour: "2-digit", minute: "2-digit", timeZone: timezone }) : "—");
  const reasonText = (p: CityPerson) => (p.reason ? t(`exitReason.${p.reason}`) : t("status.OUT_OF_OFFICE"));
  const peopleIn = (c: City) => people.filter((p) => cityOf(cities, p).id === c.id);
  const shown = city ? peopleIn(city) : people;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* City switcher: only when the points are in different cities. */}
          {cities.length > 1 && (
            <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1" role="tablist" data-testid="city-switcher">
              {cities.map((c) => {
                const count = peopleIn(c).length;
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="tab"
                    aria-selected={c.id === city?.id}
                    onClick={() => setCityId(c.id)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      c.id === city?.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {c.label}
                    {count > 0 && <span className="rounded-full bg-amber-500 px-1.5 text-xs leading-5 text-white">{count}</span>}
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
        <p className="text-sm text-muted-foreground">{t("map.hint")}</p>
        <div className="relative h-[560px] overflow-hidden rounded-xl border" data-testid="city-map">
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

      <Card>
        <CardHeader>
          <CardTitle>
            {t("map.outside")}
            <span className="ml-2 text-muted-foreground">{shown.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {shown.length === 0 ? (
            <p className="text-muted-foreground">{t("map.nobody")}</p>
          ) : (
            <ul className="grid gap-3" data-testid="city-people">
              {shown.map((p) => (
                <li key={p.id} className="flex gap-2">
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[10px] font-semibold text-white">
                    {p.initials}
                  </span>
                  <div className="min-w-0">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-muted-foreground">{[reasonText(p), p.requestTitle].filter(Boolean).join(" · ")}</div>
                    <div className="text-xs text-muted-foreground">{t("map.wentOut", { time: time(p.exitAt) })}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Legend() {
  const t = useTranslations("map");
  const items = [
    ["bg-violet-500", t("legendOffice")],
    ["bg-blue-500", t("legendRequest")],
    ["bg-amber-500", t("legendPerson")],
    ["bg-slate-200 ring-1 ring-slate-400", t("legendClient")],
  ];
  return (
    <div className="pointer-events-none absolute bottom-6 left-3 z-[400] grid gap-1 rounded-lg bg-background/90 px-3 py-2 text-xs shadow">
      {items.map(([color, label]) => (
        <div key={label} className="flex items-center gap-2">
          <span className={cn("size-2.5 rounded-full", color)} />
          {label}
        </div>
      ))}
    </div>
  );
}
