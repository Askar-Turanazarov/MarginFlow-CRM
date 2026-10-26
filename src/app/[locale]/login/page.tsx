import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { devLogin } from "@/app/actions";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/40 px-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">{app("name")}</h1>
        <p className="text-sm text-muted-foreground">{app("tagline")}</p>
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
      {quickUsers.length > 0 && (
        <Card className="w-full max-w-sm border-dashed" data-testid="dev-login">
          <CardHeader>
            <CardTitle className="text-sm">{t("devTitle")}</CardTitle>
            <CardDescription>{t("devHint")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {quickUsers.map((u) => (
              <form key={u.id} action={devLogin}>
                <input type="hidden" name="login" value={u.login} />
                <Button type="submit" variant="outline" className="w-full justify-between">
                  <span>
                    {u.employee.firstName} {u.employee.lastName}
                  </span>
                  <span className="text-muted-foreground">{roles(u.role)}</span>
                </Button>
              </form>
            ))}
          </CardContent>
        </Card>
      )}
      <LocaleSwitcher />
    </main>
  );
}
