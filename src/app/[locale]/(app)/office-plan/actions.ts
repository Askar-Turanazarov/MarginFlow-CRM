"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export type PlanErrorKey =
  | "invalid"
  | "required"
  | "deskCodeTaken"
  | "pcTaken"
  | "fileType"
  | "fileSize"
  | "notFound";
export type PlanResult = { error?: PlanErrorKey; fieldErrors?: Partial<Record<"code" | "pcNumber" | "name", PlanErrorKey>> };

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Coordinates are shares (0..1) of the plan image, so they don't depend on the display size.
const share = z.number().min(0).max(1);

const done = (): PlanResult => {
  revalidatePath("/", "layout");
  return {};
};

/** Detects the image type by its first bytes; the browser-provided type is not trusted. SVG is not accepted. */
function imageType(bytes: Uint8Array): string | null {
  const starts = (sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b);
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (starts([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  return null;
}

export async function uploadPlan(formData: FormData): Promise<PlanResult> {
  await requireUser(["ADMIN"]);
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { error: "fileType" };
  if (file.size > MAX_IMAGE_BYTES) return { error: "fileSize" };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = imageType(bytes);
  if (!mimeType) return { error: "fileType" };

  await prisma.officePlan.upsert({
    where: { id: 1 },
    update: { image: bytes, mimeType },
    create: { id: 1, image: bytes, mimeType },
  });
  return done();
}

/** Back to the built-in test plan. */
export async function resetPlan(): Promise<PlanResult> {
  await requireUser(["ADMIN"]);
  await prisma.officePlan.upsert({
    where: { id: 1 },
    update: { image: null, mimeType: null },
    create: { id: 1 },
  });
  return done();
}

const deskSchema = z.object({
  id: z.string().optional(),
  code: z.string().trim().min(1).max(10),
  pcNumber: z.string().trim().max(20),
  employeeId: z.string(),
  x: share,
  y: share,
});

export async function saveDesk(input: z.input<typeof deskSchema>): Promise<PlanResult> {
  await requireUser(["ADMIN"]);
  const parsed = deskSchema.safeParse(input);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return field === "code" ? { fieldErrors: { code: "required" } } : { error: "invalid" };
  }
  const { id, code, employeeId, x, y } = parsed.data;
  const pcNumber = parsed.data.pcNumber.toUpperCase() || null;

  if (id && !(await prisma.desk.findUnique({ where: { id } }))) return { error: "notFound" };
  if (employeeId && !(await prisma.employee.findUnique({ where: { id: employeeId } }))) return { error: "invalid" };

  try {
    await prisma.$transaction(async (tx) => {
      const desk = id
        ? await tx.desk.update({ where: { id }, data: { code, pcNumber, x, y } })
        : await tx.desk.create({ data: { code, pcNumber, x, y } });
      // One person per desk: free this desk, then move the chosen employee here (their old desk becomes free).
      await tx.employee.updateMany({
        where: { deskId: desk.id, ...(employeeId && { id: { not: employeeId } }) },
        data: { deskId: null },
      });
      if (employeeId) await tx.employee.update({ where: { id: employeeId }, data: { deskId: desk.id } });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = String(error.meta?.target ?? "");
      return target.includes("pcNumber") ? { fieldErrors: { pcNumber: "pcTaken" } } : { fieldErrors: { code: "deskCodeTaken" } };
    }
    throw error;
  }
  return done();
}

export async function moveDesk(id: string, x: number, y: number): Promise<PlanResult> {
  await requireUser(["ADMIN"]);
  const parsed = z.object({ x: share, y: share }).safeParse({ x, y });
  if (!parsed.success) return { error: "invalid" };
  const result = await prisma.desk.updateMany({ where: { id }, data: parsed.data });
  return result.count ? done() : { error: "notFound" };
}

export async function deleteDesk(id: string): Promise<PlanResult> {
  await requireUser(["ADMIN"]);
  // The employee keeps working, just without a desk (onDelete: SetNull).
  await prisma.desk.deleteMany({ where: { id } });
  return done();
}

const zoneSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(60),
  kind: z.enum(["KITCHEN", "MEETING_ROOM", "LOUNGE", "RECEPTION", "OTHER"]),
  x: share,
  y: share,
  width: share,
  height: share,
});

export async function saveZone(input: z.input<typeof zoneSchema>): Promise<PlanResult> {
  await requireUser(["ADMIN"]);
  const parsed = zoneSchema.safeParse(input);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return field === "name" ? { fieldErrors: { name: "required" } } : { error: "invalid" };
  }
  const { id, ...data } = parsed.data;
  if (data.x + data.width > 1.0001 || data.y + data.height > 1.0001) return { error: "invalid" };

  if (id) {
    const result = await prisma.zone.updateMany({ where: { id }, data });
    if (!result.count) return { error: "notFound" };
  } else {
    await prisma.zone.create({ data });
  }
  return done();
}

export async function deleteZone(id: string): Promise<PlanResult> {
  await requireUser(["ADMIN"]);
  await prisma.zone.deleteMany({ where: { id } });
  return done();
}
