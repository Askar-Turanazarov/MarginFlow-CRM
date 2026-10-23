"use client";

import type { RequestStatus } from "@prisma/client";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { NativeSelect } from "@/components/native-select";
import { REQUEST_STATUS_COLORS } from "@/components/request-status-badge";
import { cn } from "@/lib/utils";
import { assignRequest, setRequestStatus, type QuickResult } from "./actions";

export type AssigneeOption = { id: string; name: string };

function useQuickAction() {
  const t = useTranslations("requestForm.errors");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (action: () => Promise<QuickResult>) =>
    startTransition(async () => {
      const result = await action();
      setError(result.error ? t(result.error) : null);
    });
  const errorText = error && <p className="mt-1 text-xs text-destructive">{error}</p>;
  return { pending, run, errorText };
}

export function AssigneeSelect({ id, value, options }: { id: string; value: string | null; options: AssigneeOption[] }) {
  const t = useTranslations("requests");
  const { pending, run, errorText } = useQuickAction();

  return (
    <div>
      <NativeSelect
        aria-label={t("assignee")}
        className="min-w-40"
        value={value ?? ""}
        disabled={pending}
        onChange={(e) => run(() => assignRequest(id, e.target.value))}
      >
        <option value="">{t("notAssigned")}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </NativeSelect>
      {errorText}
    </div>
  );
}

export function StatusSelect({ id, value, assigned }: { id: string; value: RequestStatus; assigned: boolean }) {
  const t = useTranslations();
  const { pending, run, errorText } = useQuickAction();
  // Without an assignee only NEW is possible; with one, NEW turns into ASSIGNED.
  const options: RequestStatus[] = assigned ? ["ASSIGNED", "IN_PROGRESS", "DONE"] : ["NEW"];

  return (
    <div>
      <NativeSelect
        aria-label={t("requests.status")}
        className={cn("min-w-32 border-transparent font-medium", REQUEST_STATUS_COLORS[value])}
        value={value}
        disabled={pending || !assigned}
        onChange={(e) => run(() => setRequestStatus(id, e.target.value))}
      >
        {options.map((s) => (
          <option key={s} value={s}>
            {t(`requestStatus.${s}`)}
          </option>
        ))}
      </NativeSelect>
      {errorText}
    </div>
  );
}
