import { formatInTimeZone } from "date-fns-tz";
import { getLocale, getTranslations } from "next-intl/server";
import { FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/page";
import { Reveal } from "@/components/ui/reveal";
import { getOfficeSettings } from "@/lib/attendance";
import { requireUser } from "@/lib/session";
import { ReportForm } from "./report-form";

export default async function ReportsPage() {
  await requireUser(["ADMIN", "MANAGER"]);
  const t = await getTranslations("reports");
  const locale = await getLocale();
  const { timezone } = await getOfficeSettings();

  // "Today" in office time; the form counts quick periods from it.
  const today = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");

  return (
    <div className="grid max-w-2xl gap-5">
      <PageHeader title={t("title")} />
      <Reveal index={1}>
        <section className="surface rounded-2xl p-5 sm:p-7">
          <div className="mb-6 flex items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-sig-in/12 text-sig-in shadow-[inset_0_1px_0_var(--glass-hi)]">
              <FileSpreadsheet className="size-5" />
            </span>
            <div>
              <h2 className="font-semibold">{t("attendanceTitle")}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">{t("attendanceHint")}</p>
            </div>
          </div>
          <ReportForm today={today} locale={locale} />
        </section>
      </Reveal>
    </div>
  );
}
