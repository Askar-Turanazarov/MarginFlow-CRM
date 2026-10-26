import { getFormatter, getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { lateFrom, workdayStartAt, type OfficeClock } from "@/lib/attendance";
import { getPlanImage } from "@/lib/office-plan";
import type { CurrentUser } from "@/lib/session";
import { CheckInButton } from "./attendance-buttons";

/** Shown instead of any page until the employee presses "I'm here". */
export async function CheckInScreen({ user, settings }: { user: CurrentUser; settings: OfficeClock }) {
  const t = await getTranslations();
  const format = await getFormatter();
  const plan = await getPlanImage();
  const now = new Date();
  const desk = user.employee.desk;

  const time = (date: Date, withSeconds = false) =>
    format.dateTime(date, {
      hour: "2-digit",
      minute: "2-digit",
      second: withSeconds ? "2-digit" : undefined,
      timeZone: settings.timezone,
    });

  return (
    <div className="mx-auto grid max-w-2xl gap-4 pt-[4vh]">
      <Reveal>
        <div className="glass flex flex-col items-center gap-5 rounded-[1.75rem] px-6 py-10 text-center sm:px-10">
          <span className="glass rounded-full px-3.5 py-1.5 text-sm text-muted-foreground">
            {t("dashboard.officeTimeLabel")} <span className="font-mono text-foreground">{time(now)}</span>
          </span>
          <h1 className="text-[1.75rem] leading-tight font-semibold tracking-[-0.02em]">
            {t("dashboard.welcome", { name: user.employee.firstName })}
          </h1>
          <p className="max-w-md text-muted-foreground">
            {t("attendance.checkInHint", {
              start: time(workdayStartAt(now, settings)),
              lastOnTime: time(new Date(lateFrom(now, settings).getTime() - 1000), true),
            })}
          </p>
          <CheckInButton className="h-16 px-12 text-lg" />
        </div>
      </Reveal>

      <Reveal index={2}>
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.desk")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="text-lg font-medium" data-testid="my-desk">
              {desk ? [desk.code, desk.pcNumber && t("attendance.pc", { pc: desk.pcNumber })].filter(Boolean).join(" · ") : t("dashboard.noDesk")}
            </div>
            {desk && (
              <div className="relative overflow-hidden rounded-xl border border-border/70 bg-white dark:brightness-[.86]">
                {/* eslint-disable-next-line @next/next/no-img-element -- plan image comes from our own API */}
                <img src={plan.url} alt={t("officePlan.title")} className="block h-auto w-full" />
                <span
                  className="absolute flex size-5 -translate-x-1/2 -translate-y-1/2 animate-breathe rounded-full border-2 border-white bg-primary text-primary"
                  style={{ left: `${desk.x * 100}%`, top: `${desk.y * 100}%` }}
                  aria-hidden
                />
              </div>
            )}
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}
