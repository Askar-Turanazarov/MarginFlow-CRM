import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { EmployeeForm } from "../../employee-form";

export default async function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(["ADMIN"]);
  const { id } = await params;
  const t = await getTranslations("form");

  const user = await prisma.user.findUnique({ where: { id }, include: { employee: true } });
  if (!user) notFound();

  const desks = await prisma.desk.findMany({
    where: { OR: [{ employee: null }, { employee: { id: user.employeeId } }] },
    orderBy: { code: "asc" },
  });

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">{t("editTitle")}</h1>
      <EmployeeForm
        id={user.id}
        desks={desks}
        roleLocked={user.role === "ADMIN"}
        initial={{
          firstName: user.employee.firstName,
          lastName: user.employee.lastName,
          position: user.employee.position,
          login: user.login,
          role: user.role,
          deskId: user.employee.deskId ?? "",
          isActive: user.isActive,
        }}
      />
    </div>
  );
}
