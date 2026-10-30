"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Field, FormActions, FormError, FormSection, SubmitButton } from "@/components/form-field";
import { NativeSelect } from "@/components/native-select";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Link } from "@/i18n/navigation";
import {
  saveEmployee,
  type EmployeeField,
  type EmployeeFormState,
  type EmployeeFormValues,
} from "./actions";

type Props = {
  id?: string;
  initial: EmployeeFormValues;
  desks: { id: string; code: string; pcNumber: string | null }[];
  roleLocked: boolean;
};

export function EmployeeForm({ id, initial, desks, roleLocked }: Props) {
  const t = useTranslations();
  const [state, action, pending] = useActionState<EmployeeFormState, FormData>(saveEmployee, {});
  const v = state.values ?? initial;

  const error = (field: EmployeeField) => {
    const key = state.fieldErrors?.[field];
    return key && t(`form.errors.${key}`);
  };
  const invalid = (field: EmployeeField) => (state.fieldErrors?.[field] ? true : undefined);

  // `key` remounts the form after a failed attempt so the entered values come back (React resets forms after actions).
  return (
    <form key={state.attempt ?? 0} action={action} className="surface grid max-w-3xl gap-7 rounded-2xl p-5 sm:p-7">
      {id && <input type="hidden" name="id" value={id} />}

      <FormSection title={t("form.sectionPerson")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("form.firstName")} htmlFor="firstName" error={error("firstName")}>
            <Input id="firstName" name="firstName" defaultValue={v.firstName} aria-invalid={invalid("firstName")} autoFocus={!id} required />
          </Field>
          <Field label={t("form.lastName")} htmlFor="lastName" error={error("lastName")}>
            <Input id="lastName" name="lastName" defaultValue={v.lastName} aria-invalid={invalid("lastName")} required />
          </Field>
        </div>
        <Field label={t("form.position")} htmlFor="position" error={error("position")}>
          <Input id="position" name="position" defaultValue={v.position} aria-invalid={invalid("position")} required />
        </Field>
      </FormSection>

      <FormSection title={t("form.sectionAccess")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("form.login")} htmlFor="login" error={error("login")} hint={t("form.loginHint")}>
            <Input
              id="login"
              name="login"
              defaultValue={v.login}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className="font-mono"
              aria-invalid={invalid("login")}
              required
            />
          </Field>
          <Field
            label={t("form.password")}
            htmlFor="password"
            error={error("password")}
            hint={id ? t("form.passwordHintEdit") : t("form.passwordHintNew")}
          >
            <Input id="password" name="password" type="password" autoComplete="new-password" aria-invalid={invalid("password")} required={!id} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("form.role")} htmlFor="role" error={error("role")} hint={roleLocked && t("form.roleLocked")}>
            {roleLocked ? (
              <NativeSelect id="role" disabled defaultValue="ADMIN">
                <option value="ADMIN">{t("roles.ADMIN")}</option>
              </NativeSelect>
            ) : (
              <NativeSelect id="role" name="role" defaultValue={v.role}>
                <option value="EMPLOYEE">{t("roles.EMPLOYEE")}</option>
                <option value="MANAGER">{t("roles.MANAGER")}</option>
              </NativeSelect>
            )}
          </Field>
          <Field label={t("form.desk")} htmlFor="deskId" error={error("deskId")}>
            <NativeSelect id="deskId" name="deskId" defaultValue={v.deskId} aria-invalid={invalid("deskId")}>
              <option value="">{t("form.noDesk")}</option>
              {desks.map((desk) => (
                <option key={desk.id} value={desk.id}>
                  {desk.code}
                  {desk.pcNumber ? ` · ${desk.pcNumber}` : ""}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>

        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-foreground/[.03] px-4 py-3 text-sm">
          <span className="grid gap-0.5">
            {t("form.trackByPhone")}
            <span className="text-xs text-muted-foreground">{t("form.trackByPhoneHint")}</span>
          </span>
          <Switch name="trackByPhone" value="on" defaultChecked={v.trackByPhone} data-testid="track-by-phone" />
        </label>

        {id && (
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-foreground/[.03] px-4 py-3 text-sm">
            {t("form.active")}
            <Switch name="isActive" value="on" defaultChecked={v.isActive} />
          </label>
        )}
      </FormSection>

      <FormError>{state.error && t(`form.errors.${state.error}`)}</FormError>

      <FormActions>
        <SubmitButton pending={pending}>{pending ? t("form.saving") : t("form.save")}</SubmitButton>
        <Link href="/employees" className={buttonVariants({ variant: "ghost" })}>
          {t("form.cancel")}
        </Link>
      </FormActions>
    </form>
  );
}
