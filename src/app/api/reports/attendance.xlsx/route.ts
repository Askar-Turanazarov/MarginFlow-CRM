import { NextResponse, type NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { parseDay } from "@/lib/dates";
import { buildAttendanceWorkbook } from "@/lib/excel";
import { rejectOverLimit } from "@/lib/rate-limit";
import { getAttendanceReport, MAX_REPORT_DAYS } from "@/lib/report";
import { getCurrentUser } from "@/lib/session";

const DATE_FORMATS = { en: "mm/dd/yyyy", ru: "dd.mm.yyyy", uz: "dd.mm.yyyy" } as const;

/** GET /api/reports/attendance.xlsx?from=YYYY-MM-DD&to=YYYY-MM-DD&locale=ru — ADMIN, MANAGER. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role === "EMPLOYEE") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const limited = await rejectOverLimit(`report:${user.id}`, 10);
  if (limited) return limited;

  const params = request.nextUrl.searchParams;
  const fromStr = params.get("from") ?? "";
  const toStr = params.get("to") ?? "";
  const from = parseDay(fromStr);
  const to = parseDay(toStr);
  const days = from && to ? (to.getTime() - from.getTime()) / 86_400_000 + 1 : 0;
  if (!from || !to || days < 1 || days > MAX_REPORT_DAYS) {
    return NextResponse.json({ error: "invalidPeriod", maxDays: MAX_REPORT_DAYS }, { status: 400 });
  }

  // The report is in the language the user is looking at (or the saved one).
  const locale = routing.locales.find((l) => l === params.get("locale")) ?? routing.locales.find((l) => l === user.locale) ?? routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "report" });

  const { settings, summary, days: rows } = await getAttendanceReport(from, to);
  const file = await buildAttendanceWorkbook({
    t: (key, values) => t(key as never, values as never),
    timezone: settings.timezone,
    from: fromStr,
    to: toStr,
    summary,
    days: rows,
    dateFormat: DATE_FORMATS[locale],
  });

  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="marginflow-attendance-${fromStr}_${toStr}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
