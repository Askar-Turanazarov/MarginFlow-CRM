"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export type ClientField = "companyName" | "contactName" | "phone" | "email" | "city" | "address" | "notes";
export type ClientErrorKey = "invalid" | "required" | "email" | "notFound";

export type ClientFormValues = Record<ClientField, string> & { lat: number | null; lng: number | null };

export type ClientFormState = {
  error?: ClientErrorKey;
  fieldErrors?: Partial<Record<ClientField, ClientErrorKey>>;
  values?: ClientFormValues;
  attempt?: number;
};

const optional = (max: number) => z.string().trim().max(max);

const schema = z.object({
  companyName: z.string().trim().min(1).max(100),
  contactName: z.string().trim().min(1).max(100),
  phone: optional(40),
  email: z.union([z.literal(""), z.email().max(120)]),
  city: optional(80),
  address: optional(200),
  notes: optional(1000),
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
});

const coordinate = (value: FormDataEntryValue | null) => {
  const n = value === null || value === "" ? NaN : Number(value);
  return Number.isFinite(n) ? n : null;
};

export async function saveClient(_prev: ClientFormState, formData: FormData): Promise<ClientFormState> {
  await requireUser(["ADMIN", "MANAGER"]);
  const id = String(formData.get("id") ?? "") || null;

  const text = (name: ClientField) => String(formData.get(name) ?? "");
  const values: ClientFormValues = {
    companyName: text("companyName"),
    contactName: text("contactName"),
    phone: text("phone"),
    email: text("email").trim(),
    city: text("city"),
    address: text("address"),
    notes: text("notes"),
    lat: coordinate(formData.get("lat")),
    lng: coordinate(formData.get("lng")),
  };
  const fail = (state: Omit<ClientFormState, "values" | "attempt">): ClientFormState => ({
    error: "invalid",
    ...state,
    values,
    attempt: Date.now(),
  });

  if (id && !(await prisma.client.findUnique({ where: { id } }))) return fail({ error: "notFound" });

  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: ClientFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as ClientField;
      fieldErrors[field] = field === "email" ? "email" : "required";
    }
    return fail({ fieldErrors });
  }

  const d = parsed.data;
  // A point needs both coordinates.
  const hasPoint = d.lat !== null && d.lng !== null;
  const data = {
    companyName: d.companyName,
    contactName: d.contactName,
    phone: d.phone || null,
    email: d.email || null,
    city: d.city || null,
    address: d.address || null,
    notes: d.notes || null,
    lat: hasPoint ? d.lat : null,
    lng: hasPoint ? d.lng : null,
  };

  if (id) await prisma.client.update({ where: { id }, data });
  else await prisma.client.create({ data });

  revalidatePath("/", "layout");
  redirect({ href: "/clients", locale: await getLocale() });
  return {};
}
