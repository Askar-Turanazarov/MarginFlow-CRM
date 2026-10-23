import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { EmployeeForm } from "../employee-form";

export default async function NewEmployeePage() {
  await requireUser(["ADMIN"]);
  const t = await getTranslations("form");
  const desks = await prisma.desk.findMany({ where: { employee: null }, orderBy: { code: "asc" } });

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">{t("createTitle")}</h1>
      <EmployeeForm
        desks={desks}
        roleLocked={false}
        initial={{ firstName: "", lastName: "", position: "", login: "", role: "EMPLOYEE", deskId: "", isActive: true }}
      />
    </div>
  );
}
