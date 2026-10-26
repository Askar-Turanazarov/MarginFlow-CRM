"use client";

import { Loader2, LogIn, Power } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { checkIn, endDay, type AttendanceState } from "./actions";

/** The main button of the day: the most "physical" one — deep travel and a soft emerald glow on hover. */
export const dayButtonClass =
  "h-14 rounded-2xl px-8 text-base font-semibold hover:shadow-[inset_0_1px_0_rgb(255_255_255/.3),inset_0_-2px_0_rgb(0_0_0/.14),0_2px_3px_rgb(0_0_0/.12),0_14px_32px_-10px_color-mix(in_oklab,var(--primary)_75%,transparent)] active:translate-y-0.5";

function useAttendanceAction(action: () => Promise<AttendanceState>, successText: string) {
  const t = useTranslations("attendance.errors");
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = () =>
    startTransition(async () => {
      const result = await action();
      setError(result.error ? t(result.error) : null);
      if (result.error) toast.add({ title: t(result.error), type: "error" });
      else toast.add({ title: successText, type: "success" });
    });
  const errorText = error && <p className="text-sm text-destructive">{error}</p>;
  return { pending, run, errorText };
}

export function CheckInButton({ className }: { className?: string }) {
  const t = useTranslations("attendance");
  const { pending, run, errorText } = useAttendanceAction(checkIn, t("toast.checkedIn"));

  return (
    <div className="grid gap-2">
      <Button size="lg" className={cn(dayButtonClass, className)} disabled={pending} onClick={run}>
        {pending ? <Loader2 className="size-5 animate-spin" /> : <LogIn className="size-5" />}
        {t("checkIn")}
      </Button>
      {errorText}
    </div>
  );
}

export function EndDayButton() {
  const t = useTranslations("attendance");
  const { pending, run, errorText } = useAttendanceAction(endDay, t("toast.dayEnded"));

  return (
    <div className="grid gap-2">
      <ConfirmDialog
        trigger={
          <Button variant="outline" size="lg" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Power />}
            {t("endDay")}
          </Button>
        }
        title={t("endDay")}
        description={t("endDayConfirm")}
        confirmLabel={t("endDay")}
        onConfirm={run}
      />
      {errorText}
    </div>
  );
}
