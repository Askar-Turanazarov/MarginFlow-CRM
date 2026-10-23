import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { loadRequestFormOptions } from "../form-data";
import { RequestForm } from "../request-form";

export default async function NewRequestPage({ searchParams }: { searchParams: Promise<{ clientId?: string }> }) {
  await requireUser(["ADMIN", "MANAGER"]);
  const t = await getTranslations("requestForm");
  const { clientId = "" } = await searchParams;
  const { clients, employees } = await loadRequestFormOptions();

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">{t("createTitle")}</h1>
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
