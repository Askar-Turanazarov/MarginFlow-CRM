"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Field, FormActions, FormError, FormSection, SubmitButton, textareaClass } from "@/components/form-field";
import { LocationPicker } from "@/components/map";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { saveClient, type ClientField, type ClientFormState, type ClientFormValues } from "./actions";

const LABEL: Record<ClientField, string> = {
  companyName: "company",
  contactName: "contact",
  phone: "phone",
  email: "email",
  city: "city",
  address: "address",
  notes: "notes",
};

export function ClientForm({ id, initial }: { id?: string; initial: ClientFormValues }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState<ClientFormState, FormData>(saveClient, {});
  const v = state.values ?? initial;

  const field = (name: ClientField, opts: { required?: boolean; type?: string; autoComplete?: string; autoFocus?: boolean } = {}) => {
    const error = state.fieldErrors?.[name];
    return (
      <Field label={t(`clientForm.${LABEL[name]}`)} htmlFor={name} error={error && t(`clientForm.errors.${error}`)}>
        <Input
          id={name}
          name={name}
          type={opts.type}
          autoComplete={opts.autoComplete}
          autoFocus={opts.autoFocus}
          defaultValue={v[name]}
          required={opts.required}
          aria-invalid={error ? true : undefined}
        />
      </Field>
    );
  };

  // `key` remounts the form after a failed attempt so the entered values come back.
  return (
    <form key={state.attempt ?? 0} action={action} className="surface grid gap-7 rounded-2xl p-5 sm:p-7 lg:grid-cols-2">
      {id && <input type="hidden" name="id" value={id} />}

      <div className="grid content-start gap-7">
        <FormSection title={t("clientForm.sectionCompany")}>
          {field("companyName", { required: true, autoComplete: "organization", autoFocus: !id })}
          {field("contactName", { required: true, autoComplete: "name" })}
          <div className="grid gap-4 sm:grid-cols-2">
            {field("phone", { type: "tel", autoComplete: "tel" })}
            {field("email", { type: "email", autoComplete: "email" })}
          </div>
        </FormSection>
        <FormSection title={t("clientForm.sectionAddress")}>
          <div className="grid gap-4 sm:grid-cols-[2fr_3fr]">
            {field("city", { autoComplete: "address-level2" })}
            {field("address", { autoComplete: "street-address" })}
          </div>
          <Field label={t("clientForm.notes")} htmlFor="notes">
            <textarea id="notes" name="notes" rows={3} defaultValue={v.notes} className={textareaClass} />
          </Field>
        </FormSection>
      </div>

      <FormSection title={t("clientForm.location")}>
        <LocationPicker
          initial={v.lat !== null && v.lng !== null ? { lat: v.lat, lng: v.lng } : null}
          query={[v.address, v.city].filter(Boolean).join(", ")}
        />
      </FormSection>

      <div className="grid gap-5 lg:col-span-2">
        <FormError>{state.error && t(`clientForm.errors.${state.error}`)}</FormError>
        <FormActions>
          <SubmitButton pending={pending}>{pending ? t("common.saving") : t("common.save")}</SubmitButton>
          <Link href="/clients" className={buttonVariants({ variant: "ghost" })}>
            {t("common.cancel")}
          </Link>
        </FormActions>
      </div>
    </form>
  );
}
