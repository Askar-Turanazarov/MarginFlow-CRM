import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page";
import { requireUser } from "@/lib/session";
import { ClientForm } from "../client-form";

export default async function NewClientPage() {
  await requireUser(["ADMIN", "MANAGER"]);
  const t = await getTranslations();

  return (
    <div className="grid gap-5">
      <PageHeader title={t("clientForm.createTitle")} back={{ href: "/clients", label: t("clients.title") }} />
      <ClientForm
        initial={{ companyName: "", contactName: "", phone: "", email: "", city: "", address: "", notes: "", lat: null, lng: null }}
      />
    </div>
  );
}
