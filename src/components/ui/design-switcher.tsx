"use client";

import { Box, GlassWater } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { Segmented } from "@/components/ui/segmented";
import { DESIGN_STORAGE_KEY, type Design } from "@/lib/design";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readDesign(): Design {
  return document.documentElement.dataset.design === "tactile" ? "tactile" : "glass";
}

function saveDesign(design: Design) {
  document.documentElement.dataset.design = design;
  try {
    localStorage.setItem(DESIGN_STORAGE_KEY, design);
  } catch {
    // Storage is blocked: the design holds until the page is reloaded.
  }
  listeners.forEach((listener) => listener());
}

/** Glass / skeuomorphism: both are the same pages, only the materials differ. */
export function DesignSwitcher({ className }: { className?: string }) {
  const t = useTranslations("design");
  const design = useSyncExternalStore(subscribe, readDesign, () => "glass" as Design);

  return (
    <Segmented<Design>
      label={t("label")}
      size="sm"
      className={className}
      value={design}
      onChange={saveDesign}
      options={[
        { value: "glass", label: t("glass"), icon: <GlassWater /> },
        { value: "tactile", label: t("tactile"), icon: <Box /> },
      ]}
    />
  );
}
