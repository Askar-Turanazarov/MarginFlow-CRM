"use client";

import type { RequestStatus } from "@prisma/client";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { NativeSelect } from "@/components/native-select";
import { REQUEST_STATUS_COLORS } from "@/components/request-status-badge";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { assignRequest, setRequestStatus, type QuickResult } from "./actions";

export type AssigneeOption = { id: string; name: string };

/** Changes right from the list: the select dims while saving, then a toast confirms (or explains the error). */
function useQuickAction() {
  const t = useTranslations();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<QuickResult>, success: string) =>
    startTransition(async () => {
      const result = await action();
      toast.add(
        result.error
          ? { title: t(`requestForm.errors.${result.error}`), type: "error" }
          : { title: success, type: "success" },
      );
    });
  return { pending, run };
}

export function AssigneeSelect({ id, value, options }: { id: string; value: string | null; options: AssigneeOption[] }) {
  const t = useTranslations("requests");
  const { pending, run } = useQuickAction();

  return (
    <NativeSelect
      aria-label={t("assignee")}
      className={cn("min-w-40 transition-opacity max-sm:min-w-0", pending && "opacity-60")}
      value={value ?? ""}
      disabled={pending}
      onChange={(e) => run(() => assignRequest(id, e.target.value), t("toast.assigned"))}
    >
      <option value="">{t("notAssigned")}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </NativeSelect>
  );
}

export function StatusSelect({ id, value, assigned }: { id: string; value: RequestStatus; assigned: boolean }) {
  const t = useTranslations();
  const { pending, run } = useQuickAction();
  // Without an assignee only NEW is possible; with one, NEW turns into ASSIGNED.
  const options: RequestStatus[] = assigned ? ["ASSIGNED", "IN_PROGRESS", "DONE"] : ["NEW"];

  return (
    <NativeSelect
      aria-label={t("requests.status")}
      className={cn(
        "min-w-36 border-transparent font-medium transition-[opacity,background-color,color] duration-300 max-sm:min-w-0 disabled:opacity-100",
        REQUEST_STATUS_COLORS[value],
        pending && "opacity-60!",
      )}
      value={value}
      disabled={pending || !assigned}
      onChange={(e) => run(() => setRequestStatus(id, e.target.value), t("requests.toast.statusChanged"))}
    >
      {options.map((s) => (
        <option key={s} value={s}>
          {t(`requestStatus.${s}`)}
        </option>
      ))}
    </NativeSelect>
  );
}
