"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { checkIn, endDay, type AttendanceState } from "./actions";

function useAttendanceAction(action: () => Promise<AttendanceState>) {
  const t = useTranslations("attendance.errors");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = () =>
    startTransition(async () => {
      const result = await action();
      setError(result.error ? t(result.error) : null);
    });
  const errorText = error && <p className="text-sm text-destructive">{error}</p>;
  return { pending, run, errorText };
}

export function CheckInButton() {
  const t = useTranslations("attendance");
  const { pending, run, errorText } = useAttendanceAction(checkIn);

  return (
    <div className="grid gap-2">
      <Button size="lg" className="h-14 px-8 text-lg" disabled={pending} onClick={run}>
        {t("checkIn")}
      </Button>
      {errorText}
    </div>
  );
}

export function EndDayButton() {
  const t = useTranslations("attendance");
  const { pending, run, errorText } = useAttendanceAction(endDay);

  return (
    <div className="grid gap-2">
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => {
          if (window.confirm(t("endDayConfirm"))) run();
        }}
      >
        {t("endDay")}
      </Button>
      {errorText}
    </div>
  );
}
