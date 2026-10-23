"use client";

import type { RequestStatus } from "@prisma/client";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { NativeSelect } from "@/components/native-select";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";
import { saveRequest, type RequestField, type RequestFormState, type RequestFormValues } from "./actions";
import type { AssigneeOption } from "./request-controls";

const STATUSES: RequestStatus[] = ["NEW", "ASSIGNED", "IN_PROGRESS", "DONE"];

type Props = {
  id?: string;
  initial: RequestFormValues;
  clients: { id: string; companyName: string; city: string | null }[];
  employees: AssigneeOption[];
};

export function RequestForm({ id, initial, clients, employees }: Props) {
  const t = useTranslations();
  const [state, action, pending] = useActionState<RequestFormState, FormData>(saveRequest, {});
  const v = state.values ?? initial;

  const error = (field: RequestField) => {
    const key = state.fieldErrors?.[field];
    return key ? <p className="text-xs text-destructive">{t(`requestForm.errors.${key}`)}</p> : null;
  };
  const invalid = (field: RequestField) => (state.fieldErrors?.[field] ? true : undefined);

  return (
    <form key={state.attempt ?? 0} action={action} className="grid max-w-xl gap-4">
      {id && <input type="hidden" name="id" value={id} />}

      <div className="grid gap-2">
        <Label htmlFor="clientId">{t("requestForm.client")}</Label>
        <NativeSelect id="clientId" name="clientId" defaultValue={v.clientId} aria-invalid={invalid("clientId")} required>
          <option value="">{t("requestForm.chooseClient")}</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.companyName}
              {c.city ? ` · ${c.city}` : ""}
            </option>
          ))}
        </NativeSelect>
        {error("clientId")}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="title">{t("requestForm.title")}</Label>
        <Input id="title" name="title" defaultValue={v.title} aria-invalid={invalid("title")} required />
        {error("title")}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">{t("requestForm.description")}</Label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={v.description}
          className="rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="assigneeId">{t("requestForm.assignee")}</Label>
          <NativeSelect id="assigneeId" name="assigneeId" defaultValue={v.assigneeId} aria-invalid={invalid("assigneeId")}>
            <option value="">{t("requests.notAssigned")}</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </NativeSelect>
          {error("assigneeId")}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="status">{t("requestForm.status")}</Label>
          <NativeSelect id="status" name="status" defaultValue={v.status}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`requestStatus.${s}`)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="dueDate">{t("requestForm.dueDate")}</Label>
          <Input id="dueDate" name="dueDate" type="date" defaultValue={v.dueDate} aria-invalid={invalid("dueDate")} />
          {error("dueDate")}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{t("requestForm.statusHint")}</p>

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {t(`requestForm.errors.${state.error}`)}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? t("common.saving") : t("common.save")}
        </Button>
        <Link href="/requests" className={buttonVariants({ variant: "outline" })}>
          {t("common.cancel")}
        </Link>
      </div>
    </form>
  );
}
