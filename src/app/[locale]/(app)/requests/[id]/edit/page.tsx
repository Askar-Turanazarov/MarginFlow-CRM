import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { toDayString } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { loadRequestFormOptions } from "../../form-data";
import { RequestForm } from "../../request-form";

export default async function EditRequestPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(["ADMIN", "MANAGER"]);
  const { id } = await params;
  const t = await getTranslations("requestForm");

  const request = await prisma.request.findUnique({ where: { id } });
  if (!request) notFound();
  const { clients, employees } = await loadRequestFormOptions();

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">{t("editTitle")}</h1>
      <RequestForm
        id={request.id}
        clients={clients}
        employees={employees}
        initial={{
          clientId: request.clientId,
          title: request.title,
          description: request.description ?? "",
          assigneeId: request.assigneeId ?? "",
          status: request.status,
          dueDate: toDayString(request.dueDate),
        }}
      />
    </div>
  );
}
