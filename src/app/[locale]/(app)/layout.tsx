import { getTranslations } from "next-intl/server";
import { logout } from "@/app/actions";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { NavLinks } from "@/components/nav-links";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/session";

// Depends on the session cookie: never prerender.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const t = await getTranslations();

  const links = [
    { href: "/dashboard", label: t("nav.dashboard") },
    { href: "/employees", label: t("nav.employees") },
    { href: "/clients", label: t("nav.clients") },
    { href: "/requests", label: t("nav.requests") },
    { href: "/office-plan", label: t("nav.officePlan") },
  ];

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
          <span className="font-semibold">{t("app.name")}</span>
          <NavLinks links={links} />
          <div className="ml-auto flex items-center gap-3">
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
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
