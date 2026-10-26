import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page";
import { requireUser } from "@/lib/session";
import { loadRequestFormOptions } from "../form-data";
import { RequestForm } from "../request-form";

export default async function NewRequestPage({ searchParams }: { searchParams: Promise<{ clientId?: string }> }) {
  await requireUser(["ADMIN", "MANAGER"]);
  const t = await getTranslations();
  const { clientId = "" } = await searchParams;
  const { clients, employees } = await loadRequestFormOptions();

  return (
    <div className="grid gap-5">
      <PageHeader title={t("requestForm.createTitle")} back={{ href: "/requests", label: t("requests.title") }} />
      <RequestForm
        clients={clients}
        employees={employees}
        initial={{
          clientId: clients.some((c) => c.id === clientId) ? clientId : "",
          title: "",
          description: "",
          assigneeId: "",
          status: "NEW",
          dueDate: "",
        }}
      />
    </div>
  );
}
