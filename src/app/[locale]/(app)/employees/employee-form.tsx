"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50";

export function EmployeeForm({ id, initial, desks, roleLocked }: Props) {
  const t = useTranslations();
  const [state, action, pending] = useActionState<EmployeeFormState, FormData>(saveEmployee, {});
  const v = state.values ?? initial;

  const fieldError = (field: EmployeeField) => {
    const key = state.fieldErrors?.[field];
    return key ? <p className="text-xs text-destructive">{t(`form.errors.${key}`)}</p> : null;
  };
  const invalid = (field: EmployeeField) => (state.fieldErrors?.[field] ? true : undefined);

  // `key` remounts the form after a failed attempt so the entered values come back (React resets forms after actions).
  return (
    <form key={state.attempt ?? 0} action={action} className="grid max-w-xl gap-4">
      {id && <input type="hidden" name="id" value={id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="firstName">{t("form.firstName")}</Label>
          <Input id="firstName" name="firstName" defaultValue={v.firstName} aria-invalid={invalid("firstName")} required />
          {fieldError("firstName")}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lastName">{t("form.lastName")}</Label>
          <Input id="lastName" name="lastName" defaultValue={v.lastName} aria-invalid={invalid("lastName")} required />
          {fieldError("lastName")}
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="position">{t("form.position")}</Label>
        <Input id="position" name="position" defaultValue={v.position} aria-invalid={invalid("position")} required />
        {fieldError("position")}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="login">{t("form.login")}</Label>
          <Input
            id="login"
            name="login"
            defaultValue={v.login}
            autoComplete="off"
            autoCapitalize="none"
            aria-invalid={invalid("login")}
            required
          />
          {fieldError("login") ?? <p className="text-xs text-muted-foreground">{t("form.loginHint")}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">{t("form.password")}</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={invalid("password")}
            required={!id}
          />
          {fieldError("password") ?? (
            <p className="text-xs text-muted-foreground">
              {id ? t("form.passwordHintEdit") : t("form.passwordHintNew")}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="role">{t("form.role")}</Label>
          {roleLocked ? (
            <>
              <select id="role" className={selectClass} disabled defaultValue="ADMIN">
                <option value="ADMIN">{t("roles.ADMIN")}</option>
              </select>
              <p className="text-xs text-muted-foreground">{t("form.roleLocked")}</p>
            </>
          ) : (
            <select id="role" name="role" className={selectClass} defaultValue={v.role}>
              <option value="EMPLOYEE">{t("roles.EMPLOYEE")}</option>
              <option value="MANAGER">{t("roles.MANAGER")}</option>
            </select>
          )}
          {fieldError("role")}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="deskId">{t("form.desk")}</Label>
          <select id="deskId" name="deskId" className={selectClass} defaultValue={v.deskId} aria-invalid={invalid("deskId")}>
            <option value="">{t("form.noDesk")}</option>
            {desks.map((desk) => (
              <option key={desk.id} value={desk.id}>
                {desk.code}{desk.pcNumber ? ` · ${desk.pcNumber}` : ""}
              </option>
            ))}
          </select>
          {fieldError("deskId")}
        </div>
      </div>

      {id && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={v.isActive} className="size-4" />
          {t("form.active")}
        </label>
      )}

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {t(`form.errors.${state.error}`)}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? t("form.saving") : t("form.save")}
        </Button>
        <Link href="/employees" className={buttonVariants({ variant: "outline" })}>
          {t("form.cancel")}
        </Link>
      </div>
    </form>
  );
}
