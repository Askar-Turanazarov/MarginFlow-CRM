import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
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
