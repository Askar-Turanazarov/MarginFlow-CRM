import { getFormatter, getTranslations } from "next-intl/server";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isWorkingDay, lateFrom, officeDayDate, type OfficeClock } from "@/lib/attendance";
import { prisma } from "@/lib/prisma";

/** ADMIN dashboard: who has not checked in after 09:05:59 and who was late today. Admins themselves are not listed. */
export async function TodayOverview({ settings }: { settings: OfficeClock }) {
  const t = await getTranslations("attendance");
  const format = await getFormatter();
  const now = new Date();
  const date = officeDayDate(now, settings);
  const time = (d: Date, withSeconds = false) =>
    format.dateTime(d, {
      hour: "2-digit",
      minute: "2-digit",
      second: withSeconds ? "2-digit" : undefined,
      timeZone: settings.timezone,
    });

  if (!isWorkingDay(now, settings)) {
    return <p className="text-sm text-muted-foreground">{t("weekend")}</p>;
  }

  const checkInClosed = now >= lateFrom(now, settings);
  const staff = { isActive: true, role: { not: "ADMIN" as const } };

  const [missing, late] = await Promise.all([
    checkInClosed
      ? prisma.employee.findMany({
          where: { user: staff, workDays: { none: { date } } },
          include: { desk: true },
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        })
      : [],
    prisma.workDay.findMany({
      where: { date, isLate: true, employee: { user: staff } },
      include: { employee: true },
      orderBy: { checkInAt: "asc" },
    }),
  ]);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Card data-testid="not-checked-in">
        <CardHeader>
          <CardTitle>
            {t("notCheckedInTitle")}
            {checkInClosed && <span className="ml-2 font-mono text-muted-foreground">{missing.length}</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {!checkInClosed ? (
            <p className="text-muted-foreground">
              {t("notCheckedInWait", { time: time(new Date(lateFrom(now, settings).getTime() - 1000), true) })}
            </p>
          ) : missing.length === 0 ? (
            <p className="text-muted-foreground">{t("everyoneCheckedIn")}</p>
          ) : (
            <ul className="grid gap-2.5">
              {missing.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2.5 font-medium">
                    <Avatar id={e.id} name={`${e.firstName} ${e.lastName}`} size="sm" />
                    <span className="truncate">
                      {e.firstName} {e.lastName}
                    </span>
                  </span>
                  <span className="text-muted-foreground">{e.desk?.code ?? e.position}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card data-testid="late-today">
        <CardHeader>
          <CardTitle>
            {t("lateTodayTitle")}
            <span className="ml-2 font-mono text-muted-foreground">{late.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {late.length === 0 ? (
            <p className="text-muted-foreground">{t("nobodyLate")}</p>
          ) : (
            <ul className="grid gap-2.5">
              {late.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2.5 font-medium">
                    <Avatar id={d.employee.id} name={`${d.employee.firstName} ${d.employee.lastName}`} size="sm" />
                    <span className="truncate">
                      {d.employee.firstName} {d.employee.lastName}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-xs text-sig-late">
                    {time(d.checkInAt)} · {t("late", { minutes: d.lateMinutes })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
