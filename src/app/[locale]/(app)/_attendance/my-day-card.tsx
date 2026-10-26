import type { WorkDay } from "@prisma/client";
import { getFormatter, getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OfficeClock } from "@/lib/attendance";
import { CheckInButton, EndDayButton } from "./attendance-buttons";

/** Dashboard card: check-in time, lateness, leaving time and the "End of work" button. */
export async function MyDayCard({ workDay, settings }: { workDay: WorkDay | null; settings: OfficeClock }) {
  const t = await getTranslations("attendance");
  const format = await getFormatter();
  const time = (date: Date) =>
    format.dateTime(date, { hour: "2-digit", minute: "2-digit", timeZone: settings.timezone });

  return (
    <Card data-testid="my-day">
      <CardHeader>
        <CardTitle>{t("myDay")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {!workDay ? (
          <>
            <p className="text-sm text-muted-foreground">{t("notCheckedIn")}</p>
            <div>
              <CheckInButton />
            </div>
          </>
        ) : (
          <>
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">{t("checkInAt")}</dt>
                <dd className="text-lg font-medium">{time(workDay.checkInAt)}</dd>
                <dd className={workDay.isLate ? "text-destructive" : "text-emerald-700"}>
                  {workDay.isLate ? t("late", { minutes: workDay.lateMinutes }) : t("onTime")}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("checkOutAt")}</dt>
                <dd className="text-lg font-medium">{workDay.checkOutAt ? time(workDay.checkOutAt) : "—"}</dd>
              </div>
            </dl>
            {workDay.closed ? (
              <p className="text-sm text-muted-foreground">{t("dayClosed")}</p>
            ) : (
              <div>
                <EndDayButton />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
