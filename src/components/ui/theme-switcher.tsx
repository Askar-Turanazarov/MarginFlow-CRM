"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Segmented } from "@/components/ui/segmented";

type Mode = "system" | "light" | "dark";

/** System / light / dark. Icons only when compact (collapsed sidebar). */
export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("theme");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const options = (["system", "light", "dark"] as const).map((value) => ({
    value,
    label: compact ? undefined : t(value),
    icon: value === "system" ? <Monitor /> : value === "light" ? <Sun /> : <Moon />,
  }));

  return (
    <Segmented<Mode>
      label={t("label")}
      size="sm"
      className="w-full"
      value={mounted ? ((theme as Mode) ?? "system") : "system"}
      onChange={setTheme}
      options={options}
    />
  );
}
