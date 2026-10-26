import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page";
import { toDayString } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { loadRequestFormOptions } from "../../form-data";
import { RequestForm } from "../../request-form";

export default async function EditRequestPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(["ADMIN", "MANAGER"]);
  const { id } = await params;
  const t = await getTranslations();

  const request = await prisma.request.findUnique({ where: { id } });
  if (!request) notFound();
  const { clients, employees } = await loadRequestFormOptions();

  return (
    <div className="grid gap-5">
      <PageHeader title={t("requestForm.editTitle")} description={request.title} back={{ href: "/requests", label: t("requests.title") }} />
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
