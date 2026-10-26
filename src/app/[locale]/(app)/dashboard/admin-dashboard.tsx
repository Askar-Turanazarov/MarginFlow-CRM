"use client";

import { useQuery } from "@tanstack/react-query";
import { formatInTimeZone } from "date-fns-tz";
import { ArrowUpRight, Building2, ClipboardList, Clock, LogIn, LogOut, MapPin, Power, Undo2, UserX, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useFormatter, useTranslations } from "next-intl";
import { OfficeMiniMap, type MiniMapZone } from "@/components/office-mini-map";
import { PRESENCE_POLL_MS } from "@/components/presence";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Reveal } from "@/components/ui/reveal";
import { Link } from "@/i18n/navigation";
import type { AdminDashboard as DashboardData, FeedItem } from "@/lib/dashboard";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Props = { initial: DashboardData; imageUrl: string; zones: MiniMapZone[]; timezone: string };

type Tile = { key: keyof DashboardData["stats"]; icon: LucideIcon; tone: string; href?: string };

// Muted signal colours: in office — emerald, out — amber, not here — grey, late — coral, requests — blue.
const TILES: Tile[] = [
  { key: "inOffice", icon: Building2, tone: "text-sig-in bg-sig-in/12", href: "/office-plan" },
  { key: "outOfOffice", icon: MapPin, tone: "text-sig-out bg-sig-out/12", href: "/map" },
  { key: "notArrived", icon: UserX, tone: "text-sig-off bg-sig-off/12" },
  { key: "late", icon: Clock, tone: "text-sig-late bg-sig-late/12" },
  { key: "requestsInWork", icon: ClipboardList, tone: "text-sig-info bg-sig-info/12", href: "/requests" },
];

const FEED_STYLE: Record<FeedItem["kind"], { icon: LucideIcon; tone: string }> = {
  CHECK_IN: { icon: LogIn, tone: "bg-sig-in" },
  EXIT: { icon: LogOut, tone: "bg-sig-out" },
  RETURN: { icon: Undo2, tone: "bg-sig-info" },
  END_OF_DAY: { icon: Power, tone: "bg-sig-off" },
  ASSIGNED: { icon: ClipboardList, tone: "bg-sig-violet" },
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
    <div className="grid gap-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5" data-testid="stats">
        {TILES.map(({ key, icon: Icon, tone, href }, i) => {
          const body = (
            <div
              className={cn(
                "glass flex h-full flex-col gap-4 rounded-2xl p-4 [transition:transform_.5s_var(--ease-spring),box-shadow_.3s] sm:p-5",
                href && "group-hover/tile:-translate-y-0.5",
                key === "inOffice" && "max-md:col-span-2",
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn("flex size-10 items-center justify-center rounded-xl", tone)}>
                  <Icon className="size-5" />
                </span>
                {href && (
                  <ArrowUpRight className="size-4 text-muted-foreground opacity-0 [transition:opacity_.2s,translate_.4s_var(--ease-spring)] group-hover/tile:translate-x-0.5 group-hover/tile:-translate-y-0.5 group-hover/tile:opacity-100" />
                )}
              </div>
              <div>
                <div className="font-mono text-[2rem] leading-none font-semibold tracking-tight" data-testid={`stat-${key}`}>
                  <NumberTicker value={data.stats[key]} />
                </div>
                <div className="mt-1.5 text-sm leading-tight text-muted-foreground">
                  {t(`stats.${key}`)}
                  {key === "requestsInWork" && data.stats.requestsNew > 0 && (
                    <span className="text-sig-info"> · {t("stats.newRequests", { count: data.stats.requestsNew })}</span>
                  )}
                </div>
              </div>
            </div>
          );
          return (
            <Reveal key={key} index={i} className={cn(key === "inOffice" && "max-md:col-span-2")}>
              {href ? (
                <Link href={href} className="group/tile block h-full rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/45">
                  {body}
                </Link>
              ) : (
                body
              )}
            </Reveal>
          );
        })}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Reveal index={5}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {t("miniMapTitle")}
                <LiveDot label={t("live")} />
              </CardTitle>
              <CardAction>
                <Link href="/office-plan" className="text-sm font-medium text-primary hover:underline">
                  {t("openPlan")}
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent className="grid gap-2.5">
              <OfficeMiniMap imageUrl={imageUrl} zones={zones} timezone={timezone} />
              <p className="text-xs text-muted-foreground">{t("miniMapHint")}</p>
            </CardContent>
          </Card>
        </Reveal>

        <Reveal index={6}>
          <Card className="lg:max-h-[640px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {t("feedTitle")}
                <LiveDot label={t("live")} />
              </CardTitle>
            </CardHeader>
            <CardContent className="overscroll-contain lg:max-h-[560px] lg:overflow-y-auto">
              {data.feed.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("feed.empty")}</p>
              ) : (
                <ol className="relative grid" data-testid="feed">
                  {/* New events slide in from the top and gently push the list down. */}
                  <AnimatePresence initial={false}>
                    {data.feed.map((e) => {
                      const { icon: Icon, tone } = FEED_STYLE[e.kind];
                      const extra = details(e);
                      return (
                        <motion.li
                          key={e.id}
                          layout
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={spring.gentle}
                          className="-mx-2 flex gap-3 rounded-xl px-2 py-2.5 text-sm transition-colors hover:bg-foreground/[.035]"
                        >
                          <span className="relative mt-0.5 shrink-0">
                            <Avatar id={e.employeeId} name={e.name} size="sm" />
                            <span className={cn("absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full text-white ring-2 ring-card", tone)}>
                              <Icon className="size-2.5" strokeWidth={2.6} />
                            </span>
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="truncate font-medium">{e.name}</span>
                              <time className="shrink-0 font-mono text-xs text-muted-foreground">{when(e.at)}</time>
                            </div>
                            <div className="text-muted-foreground">
                              {t(`feed.${e.kind}`)}
                              {extra && (
                                <span className={cn(e.kind === "CHECK_IN" && e.lateMinutes ? "text-sig-late" : "")}> · {extra}</span>
                              )}
                            </div>
                          </div>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ol>
              )}
            </CardContent>
          </Card>
        </Reveal>
      </div>
    </div>
  );
}

function LiveDot({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-sig-in/10 px-2 py-0.5 text-[11px] font-medium text-sig-in">
      <span className="size-1.5 animate-breathe rounded-full bg-current" />
      {label}
    </span>
  );
}
