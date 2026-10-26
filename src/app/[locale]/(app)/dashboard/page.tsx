import type { EmployeeStatus } from "@prisma/client";
import { getFormatter, getTranslations } from "next-intl/server";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatInTimeZone } from "date-fns-tz";
import { getOfficeSettings, getTodayWorkDay } from "@/lib/attendance";
import { getAdminDashboard } from "@/lib/dashboard";
import { getPlanImage } from "@/lib/office-plan";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { MyDayCard } from "../_attendance/my-day-card";
import { OfficeClock } from "./office-clock";
import { TodayOverview } from "../_attendance/today-overview";
import { AdminDashboard } from "./admin-dashboard";

const STATUSES: EmployeeStatus[] = ["IN_OFFICE", "OUT_OF_OFFICE", "OFF_DUTY"];

export default async function DashboardPage() {
  const user = await requireUser();
  const t = await getTranslations();
  const settings = await getOfficeSettings();

  if (user.role === "ADMIN") {
    const [initial, plan, zones] = await Promise.all([getAdminDashboard(), getPlanImage(), prisma.zone.findMany()]);
    return (
      <div className="grid gap-5">
        <PageGreeting name={user.employee.firstName} timezone={settings.timezone} />
        <AdminDashboard
          initial={initial}
          imageUrl={plan.url}
          zones={zones.map(({ id, name, x, y, width, height }) => ({ id, name, x, y, width, height }))}
          timezone={settings.timezone}
        />
        <section className="grid gap-3">
          <h2 className="text-base font-semibold tracking-tight">{t("attendance.today")}</h2>
          <TodayOverview settings={settings} />
        </section>
      </div>
    );
  }

  const workDay = await getTodayWorkDay(user.employeeId, settings);

  const groups = await prisma.employee.groupBy({
    by: ["status"],
    where: { user: { isActive: true } },
    _count: true,
  });
  const count = (status: EmployeeStatus) => groups.find((g) => g.status === status)?._count ?? 0;
  const total = groups.reduce((sum, g) => sum + g._count, 0);

  return (
    <div className="grid gap-5">
      <PageGreeting name={user.employee.firstName} timezone={settings.timezone} />

      <Card>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-3">
          <div>
            <div className="text-muted-foreground">{t("dashboard.role")}</div>
            <div className="font-medium">{t(`roles.${user.role}`)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">{t("dashboard.position")}</div>
            <div className="font-medium">{user.employee.position}</div>
          </div>
          <div>
            <div className="text-muted-foreground">{t("dashboard.desk")}</div>
            <div className="font-medium">{user.employee.desk?.code ?? t("dashboard.noDesk")}</div>
          </div>
        </CardContent>
      </Card>

      <MyDayCard workDay={workDay} settings={settings} user={user} />

      <section className="grid gap-3">
        <h2 className="text-base font-semibold tracking-tight">{t("dashboard.now")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STATUSES.map((status) => (
            <Card key={status} material="glass" size="sm">
              <CardHeader>
                <CardTitle>
                  <StatusBadge status={status} />
                </CardTitle>
              </CardHeader>
              <CardContent className="font-mono text-3xl font-semibold">{count(status)}</CardContent>
            </Card>
          ))}
          <Card material="glass" size="sm">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("dashboard.staff")}</CardTitle>
            </CardHeader>
            <CardContent className="font-mono text-3xl font-semibold">{total}</CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

/** "Good morning, Olivia" by the office clock, with the office time ticking next to it. */
async function PageGreeting({ name, timezone }: { name: string; timezone: string }) {
  const t = await getTranslations("dashboard");
  const format = await getFormatter();
  const now = new Date();
  const hour = Number(formatInTimeZone(now, timezone, "H"));
  const part = hour < 5 ? "evening" : hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-sm text-muted-foreground">{format.dateTime(now, { weekday: "long", day: "numeric", month: "long", timeZone: timezone })}</p>
        <h1 className="text-[1.75rem] leading-tight font-semibold tracking-[-0.02em]">{t(`greeting.${part}`, { name })}</h1>
      </div>
      <span className="glass rounded-full px-3.5 py-1.5 text-sm text-muted-foreground">
        {t("officeTimeLabel")} <OfficeClock timezone={timezone} initial={formatInTimeZone(now, timezone, "HH:mm")} />
      </span>
    </header>
  );
}
