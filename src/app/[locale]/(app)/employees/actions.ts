"use server";

import { Prisma, type Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export type EmployeeField = "firstName" | "lastName" | "position" | "login" | "password" | "role" | "deskId";
export type EmployeeErrorKey =
  | "invalid"
  | "required"
  | "loginFormat"
  | "loginTaken"
  | "passwordShort"
  | "deskTaken"
  | "selfDeactivate"
  | "notFound";

export type EmployeeFormValues = {
  firstName: string;
  lastName: string;
  position: string;
  login: string;
  role: Role;
  deskId: string;
  isActive: boolean;
};

export type EmployeeFormState = {
  error?: EmployeeErrorKey;
  fieldErrors?: Partial<Record<EmployeeField, EmployeeErrorKey>>;
  values?: EmployeeFormValues;
  attempt?: number;
};

const FIELD_ERROR: Record<EmployeeField, EmployeeErrorKey> = {
  firstName: "required",
  lastName: "required",
  position: "required",
  login: "loginFormat",
  password: "passwordShort",
  role: "invalid",
  deskId: "invalid",
};

const schema = z.object({
  firstName: z.string().trim().min(1).max(50),
  lastName: z.string().trim().min(1).max(50),
  position: z.string().trim().min(1).max(80),
  login: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._-]{3,32}$/),
  password: z.string().max(128),
  // Admins create and edit only employees and managers.
  role: z.enum(["EMPLOYEE", "MANAGER"]).optional(),
  deskId: z.string(),
  isActive: z.boolean(),
});

export async function saveEmployee(_prev: EmployeeFormState, formData: FormData): Promise<EmployeeFormState> {
  const admin = await requireUser(["ADMIN"]);
  const id = String(formData.get("id") ?? "") || null;

  const raw = {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    position: String(formData.get("position") ?? ""),
    login: String(formData.get("login") ?? ""),
    password: String(formData.get("password") ?? ""),
    role: (formData.get("role") as string | null) || undefined,
    deskId: String(formData.get("deskId") ?? ""),
    isActive: id ? formData.get("isActive") === "on" : true,
  };
  const values: EmployeeFormValues = {
    ...raw,
    role: (raw.role as Role | undefined) ?? "EMPLOYEE",
  };
  const fail = (state: Omit<EmployeeFormState, "values" | "attempt">): EmployeeFormState => ({
    error: "invalid",
    ...state,
    values,
    attempt: Date.now(),
  });

  const target = id ? await prisma.user.findUnique({ where: { id } }) : null;
  if (id && !target) return fail({ error: "notFound" });
  if (target?.role === "ADMIN") raw.role = undefined;

  const parsed = schema.safeParse(raw);
  const fieldErrors: EmployeeFormState["fieldErrors"] = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as EmployeeField;
      fieldErrors[field] = FIELD_ERROR[field];
    }
  }
  const passwordRequired = !target || raw.password.length > 0;
  if (passwordRequired && raw.password.length < 8) fieldErrors.password = "passwordShort";
  if (!parsed.success || Object.keys(fieldErrors).length > 0) return fail({ fieldErrors });

  const data = parsed.data;
  const role: Role = target?.role === "ADMIN" ? "ADMIN" : (data.role ?? "EMPLOYEE");

  if (target?.id === admin.id && !data.isActive) return fail({ error: "selfDeactivate" });

  const sameLogin = await prisma.user.findUnique({ where: { login: data.login } });
  if (sameLogin && sameLogin.id !== target?.id) return fail({ fieldErrors: { login: "loginTaken" } });

  const deskId = data.deskId || null;
  if (deskId) {
    const desk = await prisma.desk.findUnique({ where: { id: deskId }, include: { employee: true } });
    if (!desk) return fail({ fieldErrors: { deskId: "invalid" } });
    if (desk.employee && desk.employee.id !== target?.employeeId) {
      return fail({ fieldErrors: { deskId: "deskTaken" } });
    }
  }

  const employee = { firstName: data.firstName, lastName: data.lastName, position: data.position, deskId };
  const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : undefined;

  try {
    if (target) {
      await prisma.user.update({
        where: { id: target.id },
        data: {
          login: data.login,
          role,
          isActive: data.isActive,
          ...(passwordHash && { passwordHash }),
          employee: { update: employee },
        },
      });
    } else {
      await prisma.user.create({
        data: {
          login: data.login,
          role,
          passwordHash: passwordHash!,
          employee: { create: { ...employee, email: `${data.login}@marginflow.test` } },
        },
      });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = String(error.meta?.target ?? "");
      return fail({ fieldErrors: target.includes("desk") ? { deskId: "deskTaken" } : { login: "loginTaken" } });
    }
    throw error;
  }

  redirect({ href: "/employees", locale: await getLocale() });
  return {};
}
