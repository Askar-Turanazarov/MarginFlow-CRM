"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toggleSimulation } from "./actions";

/** ADMIN: switches the movement simulator. `enabled` comes from the presence polling, so `npm run sim:on` shows up too. */
export function SimulationToggle({ enabled }: { enabled: boolean }) {
  const t = useTranslations("simulation");
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();

  return (
    <div className="glass flex h-10 items-center gap-2 rounded-xl py-1 pr-1 pl-3 text-sm" data-testid="simulation-toggle">
      <span className={cn("size-2 rounded-full", enabled ? "animate-breathe bg-sig-in text-sig-in" : "bg-sig-off/50")} />
      <span>{t(enabled ? "on" : "off")}</span>
      <Button
        size="sm"
        variant={enabled ? "ghost" : "default"}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await toggleSimulation(!enabled);
            await queryClient.invalidateQueries({ queryKey: ["presence"] });
          })
        }
      >
        {t(enabled ? "stop" : "start")}
      </Button>
    </div>
  );
}
