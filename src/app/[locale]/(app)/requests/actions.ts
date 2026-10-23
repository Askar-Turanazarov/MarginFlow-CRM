"use server";

import type { RequestStatus } from "@prisma/client";
import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { parseDay } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export type RequestField = "clientId" | "title" | "description" | "assigneeId" | "status" | "dueDate";
export type RequestErrorKey = "invalid" | "required" | "assigneeRequired" | "forbidden" | "notFound";

export type RequestFormValues = Record<RequestField, string>;

export type RequestFormState = {
  error?: RequestErrorKey;
  fieldErrors?: Partial<Record<RequestField, RequestErrorKey>>;
  values?: RequestFormValues;
  attempt?: number;
};

const STATUSES = ["NEW", "ASSIGNED", "IN_PROGRESS", "DONE"] as const;

/**
 * Status rules: without an assignee a request is NEW (it can't be in progress or done);
 * a NEW request that gets an assignee becomes ASSIGNED.
 */
function resolveStatus(status: RequestStatus, assigneeId: string | null): RequestStatus | "assigneeRequired" {
  if (!assigneeId) return status === "IN_PROGRESS" || status === "DONE" ? "assigneeRequired" : "NEW";
  return status === "NEW" ? "ASSIGNED" : status;
}

async function activeEmployeeExists(id: string) {
  return !!(await prisma.employee.findFirst({ where: { id, user: { isActive: true } } }));
}

const schema = z.object({
  clientId: z.string().min(1),
  title: z.string().trim().min(1).max(150),
  description: z.string().trim().max(2000),
  assigneeId: z.string(),
  status: z.enum(STATUSES),
  dueDate: z.string().refine((v) => v === "" || parseDay(v) !== null),
});

export async function saveRequest(_prev: RequestFormState, formData: FormData): Promise<RequestFormState> {
  await requireUser(["ADMIN", "MANAGER"]);
  const id = String(formData.get("id") ?? "") || null;

  const values = Object.fromEntries(
    (["clientId", "title", "description", "assigneeId", "status", "dueDate"] as const).map((f) => [
      f,
      String(formData.get(f) ?? ""),
    ]),
  ) as RequestFormValues;
  const fail = (state: Omit<RequestFormState, "values" | "attempt">): RequestFormState => ({
    error: "invalid",
    ...state,
    values,
    attempt: Date.now(),
  });

  if (id && !(await prisma.request.findUnique({ where: { id } }))) return fail({ error: "notFound" });

  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: RequestFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path[0] as RequestField] = "required";
    return fail({ fieldErrors });
  }
  const d = parsed.data;

  if (!(await prisma.client.findUnique({ where: { id: d.clientId } }))) {
    return fail({ fieldErrors: { clientId: "required" } });
  }
  const assigneeId = d.assigneeId || null;
  if (assigneeId && !(await activeEmployeeExists(assigneeId))) return fail({ fieldErrors: { assigneeId: "invalid" } });

  const status = resolveStatus(d.status, assigneeId);
  if (status === "assigneeRequired") return fail({ fieldErrors: { assigneeId: "assigneeRequired" } });

  const data = {
    clientId: d.clientId,
    title: d.title,
    description: d.description || null,
    assigneeId,
    status,
    dueDate: parseDay(d.dueDate),
  };
  if (id) await prisma.request.update({ where: { id }, data });
  else await prisma.request.create({ data });

  revalidatePath("/", "layout");
  redirect({ href: "/requests", locale: await getLocale() });
  return {};
}

export type QuickResult = { error?: RequestErrorKey };

/** Assign from the list. Removing the assignee returns the request to NEW. */
export async function assignRequest(id: string, assigneeId: string): Promise<QuickResult> {
  await requireUser(["ADMIN", "MANAGER"]);
  const request = await prisma.request.findUnique({ where: { id } });
  if (!request) return { error: "notFound" };

  if (!assigneeId) {
    await prisma.request.update({ where: { id }, data: { assigneeId: null, status: "NEW" } });
  } else {
    if (!(await activeEmployeeExists(assigneeId))) return { error: "invalid" };
    await prisma.request.update({
      where: { id },
      data: { assigneeId, status: request.status === "NEW" ? "ASSIGNED" : request.status },
    });
  }
  revalidatePath("/", "layout");
  return {};
}

/** Status change from the list. Employees may change only their own requests. */
export async function setRequestStatus(id: string, value: string): Promise<QuickResult> {
  const user = await requireUser();
  const parsed = z.enum(STATUSES).safeParse(value);
  if (!parsed.success) return { error: "invalid" };

  const request = await prisma.request.findUnique({ where: { id } });
  if (!request) return { error: "notFound" };
  if (user.role === "EMPLOYEE" && request.assigneeId !== user.employeeId) return { error: "forbidden" };

  const status = resolveStatus(parsed.data, request.assigneeId);
  if (status === "assigneeRequired") return { error: "assigneeRequired" };

  await prisma.request.update({ where: { id }, data: { status } });
  revalidatePath("/", "layout");
  return {};
}
