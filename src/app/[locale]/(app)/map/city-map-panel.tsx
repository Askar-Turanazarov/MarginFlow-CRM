"use client";

import { useFormatter, useNow, useTranslations } from "next-intl";
import { CityMap, type CityMapPlace } from "@/components/map";
import { useCityPresence } from "@/components/presence";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SimulationToggle } from "../_simulation/simulation-toggle";

type Props = { isAdmin: boolean; office: CityMapPlace; clients: CityMapPlace[] };

export function CityMapPanel({ isAdmin, office, clients }: Props) {
  const t = useTranslations();
  const format = useFormatter();
  const now = useNow({ updateInterval: 3_000 });
  const { data } = useCityPresence();
  const people = data?.people ?? [];

  const reasonText = (p: (typeof people)[number]) =>
    [p.reason && t(`exitReason.${p.reason}`), p.requestTitle].filter(Boolean).join(" · ");

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">{t("map.hint")}</p>
          {isAdmin && (
            <div className="ml-auto">
              <SimulationToggle enabled={!!data?.simulation} />
            </div>
          )}
        </div>
        <div className="h-[560px] overflow-hidden rounded-xl border" data-testid="city-map">
          <CityMap
            office={office}
            clients={clients}
            people={people.map((p) => ({
              ...p,
              popup: (
                <>
                  <div className="font-medium">{p.name}</div>
                  {reasonText(p) && <div>{reasonText(p)}</div>}
                </>
              ),
            }))}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {t("map.outside")}
            <span className="ml-2 text-muted-foreground">{people.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {people.length === 0 ? (
            <p className="text-muted-foreground">{t("map.nobody")}</p>
          ) : (
            <ul className="grid gap-2" data-testid="city-people">
              {people.map((p) => (
                <li key={p.id}>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-muted-foreground">
                    {[reasonText(p), format.relativeTime(new Date(p.at), now)].filter(Boolean).join(" · ")}
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
