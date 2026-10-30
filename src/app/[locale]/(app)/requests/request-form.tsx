"use client";

import type { RequestStatus } from "@prisma/client";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Field, FormActions, FormError, FormSection, SubmitButton, textareaClass } from "@/components/form-field";
import { NativeSelect } from "@/components/native-select";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    return key && t(`requestForm.errors.${key}`);
  };
  const invalid = (field: RequestField) => (state.fieldErrors?.[field] ? true : undefined);

  return (
    <form key={state.attempt ?? 0} action={action} className="surface grid max-w-3xl gap-7 rounded-2xl p-5 sm:p-7">
      {id && <input type="hidden" name="id" value={id} />}

      <FormSection title={t("requestForm.sectionWhat")}>
        <Field label={t("requestForm.client")} htmlFor="clientId" error={error("clientId")}>
          <NativeSelect id="clientId" name="clientId" defaultValue={v.clientId} aria-invalid={invalid("clientId")} required>
            <option value="">{t("requestForm.chooseClient")}</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName}
                {c.city ? ` · ${c.city}` : ""}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label={t("requestForm.title")} htmlFor="title" error={error("title")}>
          <Input id="title" name="title" defaultValue={v.title} aria-invalid={invalid("title")} autoFocus={!id && !!v.clientId} required />
        </Field>
        <Field label={t("requestForm.description")} htmlFor="description">
          <textarea id="description" name="description" rows={4} defaultValue={v.description} className={textareaClass} />
        </Field>
      </FormSection>

      <FormSection title={t("requestForm.sectionWho")}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("requestForm.assignee")} htmlFor="assigneeId" error={error("assigneeId")}>
            <NativeSelect id="assigneeId" name="assigneeId" defaultValue={v.assigneeId} aria-invalid={invalid("assigneeId")}>
              <option value="">{t("requests.notAssigned")}</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label={t("requestForm.status")} htmlFor="status">
            <NativeSelect id="status" name="status" defaultValue={v.status}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`requestStatus.${s}`)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label={t("requestForm.dueDate")} htmlFor="dueDate" error={error("dueDate")}>
            <Input id="dueDate" name="dueDate" type="date" defaultValue={v.dueDate} aria-invalid={invalid("dueDate")} className="nums" />
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">{t("requestForm.statusHint")}</p>
      </FormSection>

      <FormError>{state.error && t(`requestForm.errors.${state.error}`)}</FormError>

      <FormActions>
        <SubmitButton pending={pending}>{pending ? t("common.saving") : t("common.save")}</SubmitButton>
        <Link href="/requests" className={buttonVariants({ variant: "ghost" })}>
          {t("common.cancel")}
        </Link>
      </FormActions>
    </form>
  );
}
