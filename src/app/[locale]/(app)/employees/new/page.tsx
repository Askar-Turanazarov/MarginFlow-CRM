import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { EmployeeForm } from "../employee-form";

export default async function NewEmployeePage() {
  await requireUser(["ADMIN"]);
  const t = await getTranslations();
  const desks = await prisma.desk.findMany({ where: { employee: null }, orderBy: { code: "asc" } });

  return (
    <div className="grid gap-5">
      <PageHeader title={t("form.createTitle")} back={{ href: "/employees", label: t("employees.title") }} />
      <EmployeeForm
        desks={desks}
        roleLocked={false}
        initial={{ firstName: "", lastName: "", position: "", login: "", role: "EMPLOYEE", deskId: "", isActive: true }}
      />
    </div>
  );
}
