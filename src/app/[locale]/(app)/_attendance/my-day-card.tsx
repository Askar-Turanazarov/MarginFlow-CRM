import type { WorkDay } from "@prisma/client";
import { getFormatter, getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OfficeClock } from "@/lib/attendance";
import { cn } from "@/lib/utils";
import { CheckInButton, EndDayButton } from "./attendance-buttons";

/** Dashboard card: check-in time, lateness, leaving time and the "End of work" button. */
export async function MyDayCard({ workDay, settings }: { workDay: WorkDay | null; settings: OfficeClock }) {
  const t = await getTranslations("attendance");
  const format = await getFormatter();
  const time = (date: Date) =>
    format.dateTime(date, { hour: "2-digit", minute: "2-digit", timeZone: settings.timezone });

  return (
    <Card material="glass" data-testid="my-day">
      <CardHeader>
        <CardTitle>{t("myDay")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        {!workDay ? (
          <>
            <p className="text-sm text-muted-foreground">{t("notCheckedIn")}</p>
            <div>
              <CheckInButton />
            </div>
          </>
        ) : (
          <div className="flex flex-wrap items-end justify-between gap-5">
            <dl className="flex flex-wrap gap-x-10 gap-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">{t("checkInAt")}</dt>
                <dd className="mt-0.5 font-mono text-2xl font-semibold tracking-tight">{time(workDay.checkInAt)}</dd>
                <dd className={cn("mt-0.5 font-medium", workDay.isLate ? "text-sig-late" : "text-sig-in")}>
                  {workDay.isLate ? t("late", { minutes: workDay.lateMinutes }) : t("onTime")}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("checkOutAt")}</dt>
                <dd className="mt-0.5 font-mono text-2xl font-semibold tracking-tight">
                  {workDay.checkOutAt ? time(workDay.checkOutAt) : "—"}
                </dd>
              </div>
            </dl>
            {workDay.closed ? (
              <p className="text-sm text-muted-foreground">{t("dayClosed")}</p>
            ) : (
              <EndDayButton />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
