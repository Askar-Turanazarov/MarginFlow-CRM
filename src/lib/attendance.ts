import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import type { ExitReason } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseDay } from "@/lib/dates";

// Rules: SPEC §4. Times are stored in UTC; the workday date and 09:00 are in the office time zone.

export type OfficeClock = { workdayStart: string; lateGraceMinutes: number; timezone: string };

export async function getOfficeSettings(): Promise<OfficeClock> {
  const s = await prisma.officeSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  return { workdayStart: s.workdayStart, lateGraceMinutes: s.lateGraceMinutes, timezone: s.timezone };
}

/** Office calendar day "YYYY-MM-DD" for a moment. */
export function officeDay(at: Date, settings: OfficeClock): string {
  return formatInTimeZone(at, settings.timezone, "yyyy-MM-dd");
}

/** WorkDay.date value (@db.Date, midnight UTC) for the office day of a moment. */
export function officeDayDate(at: Date, settings: OfficeClock): Date {
  return parseDay(officeDay(at, settings))!;
}

/** Mon–Fri in the office time zone. On weekends check-in is allowed, but lateness is not counted. */
export function isWorkingDay(at: Date, settings: OfficeClock): boolean {
  const isoWeekday = Number(formatInTimeZone(at, settings.timezone, "i"));
  return isoWeekday <= 5;
}

/** Workday start (e.g. 09:00 office time) of the office day of `at`, as a UTC moment. */
export function workdayStartAt(at: Date, settings: OfficeClock): Date {
  return fromZonedTime(`${officeDay(at, settings)}T${settings.workdayStart}:00`, settings.timezone);
}

/** First moment that counts as late: start + grace + 1 min (09:06:00 with a 5-minute grace). */
export function lateFrom(at: Date, settings: OfficeClock): Date {
  return new Date(workdayStartAt(at, settings).getTime() + (settings.lateGraceMinutes + 1) * 60_000);
}

/** 09:05:59 → on time; 09:06:00 → 6 min late; minutes count from the workday start. */
export function lateness(checkInAt: Date, settings: OfficeClock): { isLate: boolean; lateMinutes: number } {
  if (!isWorkingDay(checkInAt, settings) || checkInAt < lateFrom(checkInAt, settings)) {
    return { isLate: false, lateMinutes: 0 };
  }
  const diffMs = checkInAt.getTime() - workdayStartAt(checkInAt, settings).getTime();
  return { isLate: true, lateMinutes: Math.floor(diffMs / 60_000) };
}

/** Today's WorkDay of an employee (office date), or null if not checked in yet. */
export async function getTodayWorkDay(employeeId: string, settings: OfficeClock, now = new Date()) {
  return prisma.workDay.findUnique({
    where: { employeeId_date: { employeeId, date: officeDayDate(now, settings) } },
  });
}

// ---------- Leaving and coming back (SPEC §4: IN_OFFICE ⇄ OUT_OF_OFFICE) ----------

export const EXIT_REASONS = ["LUNCH", "CLIENT_VISIT", "MEETING", "PERSONAL", "OTHER"] as const;
export type ExitInput = { reason: ExitReason; requestId?: string | null; comment?: string | null };
export type TransitionError = "notCheckedIn" | "dayClosed" | "invalidTransition" | "commentRequired" | "badRequest";

/**
 * "I'm going out": EXIT + reason, status → OUT_OF_OFFICE. The status switch is a conditional update,
 * so a double click or a stale tab cannot write a second EXIT. A request can be attached only if it is
 * assigned to this employee; OTHER needs a comment.
 */
export async function recordExit(
  employeeId: string,
  userId: string,
  input: ExitInput,
  settings: OfficeClock,
  now = new Date(),
): Promise<TransitionError | null> {
  const comment = input.comment?.trim() || null;
  if (input.reason === "OTHER" && !comment) return "commentRequired";

  const day = await getTodayWorkDay(employeeId, settings, now);
  if (!day) return "notCheckedIn";
  if (day.closed) return "dayClosed";

  const requestId = input.reason === "CLIENT_VISIT" ? input.requestId || null : null;
  if (requestId && !(await prisma.request.count({ where: { id: requestId, assigneeId: employeeId } }))) return "badRequest";

  return prisma.$transaction(async (tx) => {
    const { count } = await tx.employee.updateMany({
      where: { id: employeeId, status: "IN_OFFICE" },
      data: { status: "OUT_OF_OFFICE", currentExitReason: input.reason },
    });
    if (!count) return "invalidTransition";
    await tx.attendanceEvent.create({
      data: { workDayId: day.id, type: "EXIT", reason: input.reason, requestId, comment, at: now, createdById: userId },
    });
    return null;
  });
}

/** "I'm back": RETURN, status → IN_OFFICE. */
export async function recordReturn(
  employeeId: string,
  userId: string,
  settings: OfficeClock,
  now = new Date(),
): Promise<TransitionError | null> {
  const day = await getTodayWorkDay(employeeId, settings, now);
  if (!day) return "notCheckedIn";
  if (day.closed) return "dayClosed";

  return prisma.$transaction(async (tx) => {
    const { count } = await tx.employee.updateMany({
      where: { id: employeeId, status: "OUT_OF_OFFICE" },
      data: { status: "IN_OFFICE", currentExitReason: null },
    });
    if (!count) return "invalidTransition";
    await tx.attendanceEvent.create({ data: { workDayId: day.id, type: "RETURN", at: now, createdById: userId } });
    return null;
  });
}
