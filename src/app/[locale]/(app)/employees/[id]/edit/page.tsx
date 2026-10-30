import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { EmployeeForm } from "../../employee-form";

export default async function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(["ADMIN"]);
  const { id } = await params;
  const t = await getTranslations();

  const user = await prisma.user.findUnique({ where: { id }, include: { employee: true } });
  if (!user) notFound();

  const desks = await prisma.desk.findMany({
    where: { OR: [{ employee: null }, { employee: { id: user.employeeId } }] },
    orderBy: { code: "asc" },
  });

  return (
    <div className="grid gap-5">
      <PageHeader title={t("form.editTitle")} description={`${user.employee.firstName} ${user.employee.lastName}`} back={{ href: "/employees", label: t("employees.title") }} />
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
          trackByPhone: user.employee.trackByPhone,
        }}
      />
    </div>
  );
}
