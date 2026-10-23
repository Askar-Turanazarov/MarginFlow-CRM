"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { LocationPicker } from "@/components/map";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  const field = (name: ClientField, opts: { required?: boolean; type?: string } = {}) => {
    const error = state.fieldErrors?.[name];
    return (
      <div className="grid gap-2">
        <Label htmlFor={name}>{t(`clientForm.${LABEL[name]}`)}</Label>
        <Input
          id={name}
          name={name}
          type={opts.type}
          defaultValue={v[name]}
          required={opts.required}
          aria-invalid={error ? true : undefined}
        />
        {error && <p className="text-xs text-destructive">{t(`clientForm.errors.${error}`)}</p>}
      </div>
    );
  };

  // `key` remounts the form after a failed attempt so the entered values come back.
  return (
    <form key={state.attempt ?? 0} action={action} className="grid gap-4 lg:grid-cols-2">
      {id && <input type="hidden" name="id" value={id} />}

      <div className="grid content-start gap-4">
        {field("companyName", { required: true })}
        {field("contactName", { required: true })}
        <div className="grid gap-4 sm:grid-cols-2">
          {field("phone", { type: "tel" })}
          {field("email", { type: "email" })}
        </div>
        {field("city")}
        {field("address")}
        <div className="grid gap-2">
          <Label htmlFor="notes">{t("clientForm.notes")}</Label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={v.notes}
            className="rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
      </div>

      <div className="grid content-start gap-2">
        <Label>{t("clientForm.location")}</Label>
        <LocationPicker
          initial={v.lat !== null && v.lng !== null ? { lat: v.lat, lng: v.lng } : null}
          query={[v.address, v.city].filter(Boolean).join(", ")}
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-destructive lg:col-span-2">
          {t(`clientForm.errors.${state.error}`)}
        </p>
      )}

      <div className="flex gap-2 lg:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? t("common.saving") : t("common.save")}
        </Button>
        <Link href="/clients" className={buttonVariants({ variant: "outline" })}>
          {t("common.cancel")}
        </Link>
      </div>
    </form>
  );
}
