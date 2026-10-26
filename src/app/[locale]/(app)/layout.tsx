import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import type { NavItem } from "@/components/nav-links";
import { QueryProvider } from "@/components/query-provider";
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

  const links: NavItem[] = mustCheckIn
    ? []
    : [
        { href: "/dashboard", label: t("nav.dashboard"), icon: "dashboard" },
        { href: "/employees", label: t("nav.employees"), icon: "employees" },
        { href: "/clients", label: t("nav.clients"), icon: "clients" },
        { href: "/requests", label: t("nav.requests"), icon: "requests" },
        { href: "/office-plan", label: t("nav.officePlan"), icon: "officePlan" },
        ...(user.role === "EMPLOYEE"
          ? []
          : ([
              { href: "/map", label: t("nav.map"), icon: "map" },
              { href: "/reports", label: t("nav.reports"), icon: "reports" },
            ] satisfies NavItem[])),
      ];
  // Everyone sees that positions are simulated, so nobody takes them for real ones.
  const simulation = await getSimulationEnabled();

  return (
    <QueryProvider>
      <AppShell
        links={links}
        user={{ id: user.employeeId, name: `${user.employee.firstName} ${user.employee.lastName}`, role: t(`roles.${user.role}`) }}
        simulationLabel={simulation ? t("simulation.badge") : undefined}
      >
        {mustCheckIn ? <CheckInScreen user={user} settings={settings} /> : children}
      </AppShell>
    </QueryProvider>
  );
}
