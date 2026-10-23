"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { saveLocale } from "@/app/actions";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

const LOCALE_NAMES: Record<AppLocale, string> = { en: "English", ru: "Русский", uz: "Oʻzbekcha" };

export function LocaleSwitcher() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  return (
    <select
      aria-label={t("language")}
      value={locale}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as AppLocale;
        startTransition(async () => {
          await saveLocale(next);
          router.replace(pathname, { locale: next });
        });
      }}
      className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
    >
      {routing.locales.map((l) => (
        <option key={l} value={l}>
          {LOCALE_NAMES[l]}
        </option>
      ))}
    </select>
  );
}
