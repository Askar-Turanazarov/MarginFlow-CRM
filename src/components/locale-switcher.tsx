"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { saveLocale } from "@/app/actions";
import { NativeSelect } from "@/components/native-select";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export const LOCALE_NAMES: Record<AppLocale, string> = { en: "English", ru: "Русский", uz: "Oʻzbekcha" };

/** Saves the choice for the user and re-renders the same page in the new language. */
export function useSwitchLocale() {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const switchTo = (next: AppLocale) =>
    startTransition(async () => {
      await saveLocale(next);
      router.replace(pathname, { locale: next });
    });
  return { pending, switchTo };
}

export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const { pending, switchTo } = useSwitchLocale();

  return (
    <NativeSelect
      aria-label={t("language")}
      value={locale}
      disabled={pending}
      onChange={(e) => switchTo(e.target.value as AppLocale)}
      className={cn("h-8 rounded-lg text-sm max-md:h-10", className)}
    >
      {routing.locales.map((l) => (
        <option key={l} value={l}>
          {LOCALE_NAMES[l]}
        </option>
      ))}
    </NativeSelect>
  );
}
