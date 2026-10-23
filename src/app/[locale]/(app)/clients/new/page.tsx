import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { ClientForm } from "../client-form";

export default async function NewClientPage() {
  await requireUser(["ADMIN", "MANAGER"]);
  const t = await getTranslations("clientForm");

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">{t("createTitle")}</h1>
      <ClientForm
        initial={{ companyName: "", contactName: "", phone: "", email: "", city: "", address: "", notes: "", lat: null, lng: null }}
      />
    </div>
  );
}
