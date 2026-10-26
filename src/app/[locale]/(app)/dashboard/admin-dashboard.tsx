"use client";

import { useQuery } from "@tanstack/react-query";
import { formatInTimeZone } from "date-fns-tz";
import { Building2, ClipboardList, Clock, LogIn, LogOut, MapPin, Power, Undo2, UserX, type LucideIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { OfficeMiniMap, type MiniMapZone } from "@/components/office-mini-map";
import { PRESENCE_POLL_MS } from "@/components/presence";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { AdminDashboard as DashboardData, FeedItem } from "@/lib/dashboard";
import { cn } from "@/lib/utils";

type Props = { initial: DashboardData; imageUrl: string; zones: MiniMapZone[]; timezone: string };

type Tile = { key: keyof DashboardData["stats"]; icon: LucideIcon; tone: string; href?: string };

const TILES: Tile[] = [
  { key: "inOffice", icon: Building2, tone: "bg-emerald-50 text-emerald-700 ring-emerald-200", href: "/office-plan" },
  { key: "outOfOffice", icon: MapPin, tone: "bg-amber-50 text-amber-700 ring-amber-200", href: "/map" },
  { key: "notArrived", icon: UserX, tone: "bg-slate-50 text-slate-700 ring-slate-200" },
  { key: "late", icon: Clock, tone: "bg-rose-50 text-rose-700 ring-rose-200" },
  { key: "requestsInWork", icon: ClipboardList, tone: "bg-sky-50 text-sky-700 ring-sky-200", href: "/requests" },
];

const FEED_STYLE: Record<FeedItem["kind"], { icon: LucideIcon; tone: string }> = {
  CHECK_IN: { icon: LogIn, tone: "bg-emerald-100 text-emerald-700" },
  EXIT: { icon: LogOut, tone: "bg-amber-100 text-amber-700" },
  RETURN: { icon: Undo2, tone: "bg-sky-100 text-sky-700" },
  END_OF_DAY: { icon: Power, tone: "bg-slate-100 text-slate-600" },
  ASSIGNED: { icon: ClipboardList, tone: "bg-violet-100 text-violet-700" },
};

export function AdminDashboard({ initial, imageUrl, zones, timezone }: Props) {
  const t = useTranslations("dashboard");
  const tr = useTranslations();
  const format = useFormatter();
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async (): Promise<DashboardData> => {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      if (!res.ok) throw new Error(`dashboard: ${res.status}`);
      return res.json();
    },
    initialData: initial,
    refetchInterval: PRESENCE_POLL_MS,
  });

  const today = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
  const when = (iso: string) => {
    const d = new Date(iso);
    const sameDay = formatInTimeZone(d, timezone, "yyyy-MM-dd") === today;
    return format.dateTime(d, {
      hour: "2-digit",
      minute: "2-digit",
      ...(!sameDay && { day: "numeric", month: "short" }),
      timeZone: timezone,
    });
  };

  const details = (e: FeedItem) => {
    if (e.kind === "CHECK_IN") return e.lateMinutes ? t("feed.late", { minutes: e.lateMinutes }) : t("feed.onTime");
    if (e.kind === "EXIT") return [e.reason && tr(`exitReason.${e.reason}`), e.request].filter(Boolean).join(" · ");
    if (e.kind === "ASSIGNED") return [e.request, e.client].filter(Boolean).join(" · ");
    return "";
  };

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5" data-testid="stats">
        {TILES.map(({ key, icon: Icon, tone, href }) => {
          const body = (
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 sm:size-11", tone)}>
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <div className="text-3xl leading-none font-semibold tabular-nums" data-testid={`stat-${key}`}>
                    {data.stats[key]}
                  </div>
                  <div className="mt-1 text-sm leading-tight text-muted-foreground">{t(`stats.${key}`)}</div>
                  {key === "requestsInWork" && data.stats.requestsNew > 0 && (
                    <div className="text-xs text-muted-foreground">{t("stats.newRequests", { count: data.stats.requestsNew })}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
          return href ? (
            <Link key={key} href={href} className="rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
              {body}
            </Link>
          ) : (
            <div key={key}>{body}</div>
          );
        })}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>{t("miniMapTitle")}</CardTitle>
            <Link href="/office-plan" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
              {t("openPlan")}
            </Link>
          </CardHeader>
          <CardContent className="grid gap-2">
            <OfficeMiniMap imageUrl={imageUrl} zones={zones} timezone={timezone} />
            <p className="text-xs text-muted-foreground">{t("miniMapHint")}</p>
          </CardContent>
        </Card>

        <Card className="lg:max-h-[640px] lg:overflow-hidden">
          <CardHeader>
            <CardTitle>{t("feedTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="lg:max-h-[560px] lg:overflow-y-auto">
            {data.feed.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("feed.empty")}</p>
            ) : (
              <ol className="relative grid gap-4" data-testid="feed">
                {data.feed.map((e) => {
                  const { icon: Icon, tone } = FEED_STYLE[e.kind];
                  const extra = details(e);
                  return (
                    <li key={e.id} className="flex gap-3 text-sm">
                      <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full", tone)}>
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate font-medium">{e.name}</span>
                          <time className="shrink-0 text-xs text-muted-foreground tabular-nums">{when(e.at)}</time>
                        </div>
                        <div className="text-muted-foreground">
                          {t(`feed.${e.kind}`)}
                          {extra && (
                            <span className={cn(e.kind === "CHECK_IN" && e.lateMinutes ? "text-rose-600" : "")}> · {extra}</span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
