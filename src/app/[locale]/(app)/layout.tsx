import { getTranslations } from "next-intl/server";
import { logout } from "@/app/actions";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { NavLinks } from "@/components/nav-links";
import { QueryProvider } from "@/components/query-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getOfficeSettings, getTodayWorkDay, isWorkingDay } from "@/lib/attendance";
import { getSimulationEnabled } from "@/lib/presence";
import { requireUser } from "@/lib/session";
import { CheckInScreen } from "./_attendance/check-in-screen";

// Depends on the session cookie: never prerender.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const t = await getTranslations();

  // Check-in is mandatory for staff on working days: until "I'm here" is pressed, no other page is shown.
  const settings = await getOfficeSettings();
  const mustCheckIn =
    user.role !== "ADMIN" &&
    isWorkingDay(new Date(), settings) &&
    !(await getTodayWorkDay(user.employeeId, settings));

  const links = [
    { href: "/dashboard", label: t("nav.dashboard") },
    { href: "/employees", label: t("nav.employees") },
    { href: "/clients", label: t("nav.clients") },
    { href: "/requests", label: t("nav.requests") },
    { href: "/office-plan", label: t("nav.officePlan") },
    ...(user.role === "EMPLOYEE"
      ? []
      : [
          { href: "/map", label: t("nav.map") },
          { href: "/reports", label: t("nav.reports") },
        ]),
  ];
  // Everyone sees that positions are simulated, so nobody takes them for real ones.
  const simulation = await getSimulationEnabled();

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
          <span className="font-semibold">{t("app.name")}</span>
          {!mustCheckIn && <NavLinks links={links} />}
          <div className="ml-auto flex flex-wrap items-center gap-3">
            {simulation && (
              <Badge className="bg-sky-100 text-sky-800" data-testid="simulation-badge">
                {t("simulation.badge")}
              </Badge>
            )}
            <span className="text-sm">
              {user.employee.firstName} {user.employee.lastName}
            </span>
            <Badge variant="secondary" data-testid="current-role">
              {t(`roles.${user.role}`)}
            </Badge>
            <LocaleSwitcher />
            <form action={logout}>
              <Button type="submit" variant="outline" size="sm">
                {t("nav.logout")}
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <QueryProvider>{mustCheckIn ? <CheckInScreen user={user} settings={settings} /> : children}</QueryProvider>
      </main>
    </div>
  );
}
