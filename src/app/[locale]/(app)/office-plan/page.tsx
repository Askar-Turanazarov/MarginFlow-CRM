import { getTranslations } from "next-intl/server";
import { getPlanImage } from "@/lib/office-plan";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { OfficePlanEditor, type DeskView, type EmployeeOption, type ZoneView } from "./office-plan-editor";

export default async function OfficePlanPage() {
  const user = await requireUser();
  const canEdit = user.role === "ADMIN";
  const t = await getTranslations("officePlan");

  const [plan, desks, zones, employees] = await Promise.all([
    getPlanImage(),
    prisma.desk.findMany({ include: { employee: true }, orderBy: { code: "asc" } }),
    prisma.zone.findMany({ orderBy: { createdAt: "asc" } }),
    canEdit
      ? prisma.employee.findMany({
          where: { user: { isActive: true } },
          include: { desk: true },
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        })
      : [],
  ]);

  const deskViews: DeskView[] = desks.map((d) => ({
    id: d.id,
    code: d.code,
    pcNumber: d.pcNumber,
    x: d.x,
    y: d.y,
    employee: d.employee && {
      id: d.employee.id,
      name: `${d.employee.firstName} ${d.employee.lastName}`,
      position: d.employee.position,
      status: d.employee.status,
    },
  }));
  const zoneViews: ZoneView[] = zones.map(({ id, name, kind, x, y, width, height }) => ({ id, name, kind, x, y, width, height }));
  const employeeOptions: EmployeeOption[] = employees.map((e) => ({
    id: e.id,
    name: `${e.firstName} ${e.lastName}`,
    deskCode: e.desk?.code ?? null,
  }));
  const occupied = desks.filter((d) => d.employee).length;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <span className="text-sm text-muted-foreground">
          {t("stats", { total: desks.length, occupied, free: desks.length - occupied })}
        </span>
      </div>
      <OfficePlanEditor
        desks={deskViews}
        zones={zoneViews}
        employees={employeeOptions}
        imageUrl={plan.url}
        isTestPlan={plan.isTestPlan}
        canEdit={canEdit}
      />
    </div>
  );
}
