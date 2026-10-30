import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { devLogin } from "@/app/actions";
import { BrandMark } from "@/components/app-shell";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { DesignSwitcher } from "@/components/ui/design-switcher";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { redirect } from "@/i18n/navigation";
import { DEV_LOGIN_ENABLED, isLocalHost } from "@/lib/dev-login";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { LoginForm } from "./login-form";

// Depends on the session cookie: never prerender.
export const dynamic = "force-dynamic";

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (await getCurrentUser()) redirect({ href: "/dashboard", locale });

  const t = await getTranslations("login");
  const app = await getTranslations("app");
  const roles = await getTranslations("roles");

  // TEMPORARY, `npm run dev` on localhost only: one-click login as the admin and managers.
  const quickUsers =
    DEV_LOGIN_ENABLED && isLocalHost((await headers()).get("host"))
      ? await prisma.user.findMany({
          where: { isActive: true, role: { in: ["ADMIN", "MANAGER"] } },
          include: { employee: true },
          orderBy: [{ role: "asc" }, { login: "asc" }],
        })
      : [];

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-5 px-4 pt-28 pb-10 sm:py-10">
      <div className="absolute top-4 right-4 flex flex-col items-end gap-2 sm:flex-row sm:items-center">
        <DesignSwitcher />
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeSwitcher compact />
        </div>
      </div>

      <section data-leather className="glass-strong w-full max-w-[400px] animate-rise rounded-[2rem] p-7 sm:p-9">
        <div className="mb-7 flex items-center gap-3">
          <BrandMark />
          <div>
            <div data-plate className="w-fit font-semibold tracking-[-0.01em]">{app("name")}</div>
            <div className="text-xs text-muted-foreground">{app("tagline")}</div>
          </div>
        </div>
        <h1 className="text-[1.75rem] leading-tight font-semibold tracking-[-0.02em]">{t("title")}</h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">{t("subtitle")}</p>
        <LoginForm />
      </section>

      {quickUsers.length > 0 && (
        <section className="glass w-full max-w-[400px] animate-rise rounded-3xl border border-dashed [animation-delay:120ms] border-border p-5" data-testid="dev-login">
          <h2 className="text-sm font-semibold">{t("devTitle")}</h2>
          <p className="mt-0.5 mb-3 text-xs text-muted-foreground">{t("devHint")}</p>
          <div className="grid gap-1">
            {quickUsers.map((u) => (
              <form key={u.id} action={devLogin}>
                <input type="hidden" name="login" value={u.login} />
                <Button type="submit" variant="ghost" className="h-11 w-full justify-start gap-3 px-2">
                  <Avatar id={u.employee.id} name={`${u.employee.firstName} ${u.employee.lastName}`} size="sm" />
                  <span className="flex-1 text-left">
                    {u.employee.firstName} {u.employee.lastName}
                  </span>
                  <span className="text-xs text-muted-foreground">{roles(u.role)}</span>
                </Button>
              </form>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
