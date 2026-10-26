import { formatInTimeZone } from "date-fns-tz";
import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getOfficeSettings } from "@/lib/attendance";
import { requireUser } from "@/lib/session";

export default async function ReportsPage() {
  await requireUser(["ADMIN", "MANAGER"]);
  const t = await getTranslations("reports");
  const locale = await getLocale();
  const { timezone } = await getOfficeSettings();

  // Default period: from the 1st of the current month to today (office time).
  const today = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
  const monthStart = `${today.slice(0, 8)}01`;

  return (
    <div className="grid max-w-xl gap-4">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t("attendanceTitle")}</CardTitle>
          <CardDescription>{t("attendanceHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* A plain GET form: the browser downloads the .xlsx file. */}
          <form method="get" action="/api/reports/attendance.xlsx" className="grid gap-4" data-testid="report-form">
            <input type="hidden" name="locale" value={locale} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="from">{t("from")}</Label>
                <Input id="from" name="from" type="date" required defaultValue={monthStart} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="to">{t("to")}</Label>
                <Input id="to" name="to" type="date" required defaultValue={today} />
              </div>
            </div>
            <div>
              <Button type="submit">{t("download")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
