import { getFormatter, getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="mx-auto grid max-w-2xl gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            {t("dashboard.welcome", { name: user.employee.firstName })}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-muted-foreground">
            {t("attendance.checkInHint", {
              start: time(workdayStartAt(now, settings)),
              lastOnTime: time(new Date(lateFrom(now, settings).getTime() - 1000), true),
            })}
          </p>
          <p className="text-sm">{t("attendance.officeTime", { time: time(now) })}</p>
          <CheckInButton />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.desk")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="text-lg font-medium" data-testid="my-desk">
            {desk ? [desk.code, desk.pcNumber && t("attendance.pc", { pc: desk.pcNumber })].filter(Boolean).join(" · ") : t("dashboard.noDesk")}
          </div>
          {desk && (
            <div className="relative overflow-hidden rounded-lg border bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element -- plan image comes from our own API */}
              <img src={plan.url} alt={t("officePlan.title")} className="block h-auto w-full" />
              <span
                className="absolute flex size-5 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border-2 border-white bg-primary ring-4 ring-primary/40"
                style={{ left: `${desk.x * 100}%`, top: `${desk.y * 100}%` }}
                aria-hidden
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
