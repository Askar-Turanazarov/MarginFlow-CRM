import type { EmployeeStatus } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOfficeSettings, getTodayWorkDay } from "@/lib/attendance";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { MyDayCard } from "../_attendance/my-day-card";
import { TodayOverview } from "../_attendance/today-overview";

const STATUSES: EmployeeStatus[] = ["IN_OFFICE", "OUT_OF_OFFICE", "OFF_DUTY"];

export default async function DashboardPage() {
  const user = await requireUser();
  const t = await getTranslations();
  const settings = await getOfficeSettings();
  const workDay = await getTodayWorkDay(user.employeeId, settings);

  const groups = await prisma.employee.groupBy({
    by: ["status"],
    where: { user: { isActive: true } },
    _count: true,
  });
  const count = (status: EmployeeStatus) => groups.find((g) => g.status === status)?._count ?? 0;
  const total = groups.reduce((sum, g) => sum + g._count, 0);

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">
        {t("dashboard.welcome", { name: user.employee.firstName })}
      </h1>

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

      <MyDayCard workDay={workDay} settings={settings} />

      {user.role === "ADMIN" && (
        <section className="grid gap-3">
          <h2 className="text-lg font-medium">{t("attendance.today")}</h2>
          <TodayOverview settings={settings} />
        </section>
      )}

      <section className="grid gap-3">
        <h2 className="text-lg font-medium">{t("dashboard.now")}</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          {STATUSES.map((status) => (
            <Card key={status}>
              <CardHeader>
                <CardTitle>
                  <StatusBadge status={status} />
                </CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">{count(status)}</CardContent>
            </Card>
          ))}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">{t("dashboard.staff")}</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">{total}</CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
