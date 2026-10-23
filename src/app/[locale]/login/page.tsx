import { getTranslations, setRequestLocale } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "@/i18n/navigation";
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
      <LocaleSwitcher />
    </main>
  );
}
