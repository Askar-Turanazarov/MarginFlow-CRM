"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  EXIT_REASONS,
  getOfficeSettings,
  getTodayWorkDay,
  lateness,
  officeDayDate,
  recordExit,
  recordReturn,
  type TransitionError,
} from "@/lib/attendance";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export type AttendanceState = { error?: TransitionError };

/** "I'm here": opens today's WorkDay, writes CHECK_IN and calculates lateness (SPEC §3–4). */
export async function checkIn(): Promise<AttendanceState> {
  const user = await requireUser();
  const settings = await getOfficeSettings();
  const now = new Date();

  const today = await getTodayWorkDay(user.employeeId, settings, now);
  // Re-check-in after "End of work" on the same day — only through an admin.
  if (today?.closed) return { error: "dayClosed" };

  if (!today) {
    try {
      await prisma.$transaction([
        prisma.workDay.create({
          data: {
            employeeId: user.employeeId,
            date: officeDayDate(now, settings),
            checkInAt: now,
            ...lateness(now, settings),
            events: { create: { type: "CHECK_IN", at: now, createdById: user.id } },
          },
        }),
        prisma.employee.update({
          where: { id: user.employeeId },
          data: { status: "IN_OFFICE", currentExitReason: null },
        }),
      ]);
    } catch (error) {
      // Double click: the second request hits @@unique([employeeId, date]) — the first one already checked in.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
    }
  }

  revalidatePath("/", "layout");
  return {};
}

/** "End of work": remembers the leaving time and closes the day (status → OFF_DUTY). */
export async function endDay(): Promise<AttendanceState> {
  const user = await requireUser();
  const settings = await getOfficeSettings();
  const now = new Date();

  const today = await getTodayWorkDay(user.employeeId, settings, now);
  if (!today) return { error: "notCheckedIn" };

  await prisma.$transaction(async (tx) => {
    // Only an open day is closed, so a double click writes END_OF_DAY once.
    const { count } = await tx.workDay.updateMany({
      where: { id: today.id, closed: false },
      data: { checkOutAt: now, closed: true },
    });
    if (!count) return;
    await tx.attendanceEvent.create({
      data: { workDayId: today.id, type: "END_OF_DAY", at: now, createdById: user.id },
    });
    await tx.employee.update({
      where: { id: user.employeeId },
      data: { status: "OFF_DUTY", currentExitReason: null },
    });
  });

  revalidatePath("/", "layout");
  return {};
}

const exitSchema = z.object({
  reason: z.enum(EXIT_REASONS),
  requestId: z.string().max(40).nullish(),
  comment: z.string().max(300).nullish(),
});

/** "I'm going out" with a reason (END_OF_DAY is a separate action: endDay). */
export async function exitOffice(input: z.input<typeof exitSchema>): Promise<AttendanceState> {
  const user = await requireUser();
  const data = exitSchema.safeParse(input);
  if (!data.success) return { error: "badRequest" };

  const error = await recordExit(user.employeeId, user.id, data.data, await getOfficeSettings());
  revalidatePath("/", "layout");
  return error ? { error } : {};
}

/** "I'm back in the office". */
export async function returnToOffice(): Promise<AttendanceState> {
  const user = await requireUser();
  const error = await recordReturn(user.employeeId, user.id, await getOfficeSettings());
  revalidatePath("/", "layout");
  return error ? { error } : {};
}
