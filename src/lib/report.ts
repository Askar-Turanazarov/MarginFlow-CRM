import type { AttendanceEventType, ExitReason } from "@prisma/client";
import { getOfficeSettings, officeDayDate } from "@/lib/attendance";
import { toDayString } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

// Attendance report (SPEC §6): hours in and out of the office per day and per employee.
// Shared by the Excel export and the MCP server.

export const MAX_REPORT_DAYS = 366;

type TimelineEvent = { type: AttendanceEventType; at: Date; reason?: ExitReason | null };
export type ExitSpan = { reason: ExitReason | null; from: Date; to: Date | null };

/**
 * Walks the day's events: CHECK_IN / RETURN start office time, EXIT starts time outside,
 * END_OF_DAY stops the clock. A day that is still open is counted up to `openUntil`.
 * Example: 09:12 in, 13:00 lunch, 14:00 back, 18:00 end → office 7 h 48 min, outside 1 h.
 */
export function splitDay(events: TimelineEvent[], openUntil: Date) {
  let officeMs = 0;
  let outMs = 0;
  let state: "in" | "out" | null = null;
  let since = 0;
  const exits: ExitSpan[] = [];

  const close = (at: number) => {
    if (state === "in") officeMs += Math.max(0, at - since);
    if (state === "out") {
      outMs += Math.max(0, at - since);
      exits[exits.length - 1].to = new Date(at);
    }
  };

  for (const e of [...events].sort((a, b) => a.at.getTime() - b.at.getTime())) {
    const at = e.at.getTime();
    if (e.type === "CHECK_IN" && state === null) {
      state = "in";
      since = at;
    } else if (e.type === "EXIT" && state === "in") {
      close(at);
      exits.push({ reason: e.reason ?? null, from: e.at, to: null });
      state = "out";
      since = at;
    } else if (e.type === "RETURN" && state === "out") {
      close(at);
      state = "in";
      since = at;
    } else if (e.type === "END_OF_DAY" && state !== null) {
      close(at);
      state = null;
    }
  }
  if (state !== null) close(Math.max(since, openUntil.getTime()));
  return { officeMs, outMs, exits };
}

export type ReportDay = {
  date: string; // YYYY-MM-DD, office calendar day
  employeeId: string;
  name: string;
  checkInAt: Date;
  checkOutAt: Date | null;
  isLate: boolean;
  lateMinutes: number;
  officeMs: number;
  outMs: number;
  exits: ExitSpan[];
  open: boolean;
};

export type ReportSummary = {
  employeeId: string;
  name: string;
  position: string;
  days: number;
  lateCount: number;
  lateMinutes: number;
  officeMs: number;
  outMs: number;
};

/** Days and per-employee totals for [from, to] (calendar days, both inclusive). */
export async function getAttendanceReport(from: Date, to: Date, employeeId?: string) {
  const settings = await getOfficeSettings();
  const now = new Date();
  const today = officeDayDate(now, settings).getTime();

  const [workDays, employees] = await Promise.all([
    prisma.workDay.findMany({
      where: { date: { gte: from, lte: to }, ...(employeeId && { employeeId }) },
      include: { employee: true, events: { orderBy: { at: "asc" } } },
      orderBy: [{ date: "asc" }, { checkInAt: "asc" }],
    }),
    // Everyone active is listed in the summary, also with 0 days — absences are visible.
    prisma.employee.findMany({
      where: employeeId ? { id: employeeId } : { user: { isActive: true } },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
  ]);

  const days: ReportDay[] = workDays.map((d) => {
    // Today's open day counts up to now; an unclosed past day stops at its last event.
    const lastEventAt = d.events.at(-1)?.at ?? d.checkInAt;
    const openUntil = d.closed ? lastEventAt : d.date.getTime() === today ? now : lastEventAt;
    const { officeMs, outMs, exits } = splitDay(d.events, openUntil);
    return {
      date: toDayString(d.date),
      employeeId: d.employeeId,
      name: `${d.employee.firstName} ${d.employee.lastName}`,
      checkInAt: d.checkInAt,
      checkOutAt: d.checkOutAt,
      isLate: d.isLate,
      lateMinutes: d.lateMinutes,
      officeMs,
      outMs,
      exits,
      open: !d.closed,
    };
  });

  const summary: ReportSummary[] = employees.map((e) => {
    const own = days.filter((d) => d.employeeId === e.id);
    return {
      employeeId: e.id,
      name: `${e.firstName} ${e.lastName}`,
      position: e.position,
      days: own.length,
      lateCount: own.filter((d) => d.isLate).length,
      lateMinutes: own.reduce((sum, d) => sum + d.lateMinutes, 0),
      officeMs: own.reduce((sum, d) => sum + d.officeMs, 0),
      outMs: own.reduce((sum, d) => sum + d.outMs, 0),
    };
  });

  return { settings, days, summary };
}

/** 28 080 000 ms → "7 h 48 min"-style parts, for texts outside Excel. */
export function hoursMinutes(ms: number) {
  const totalMinutes = Math.round(ms / 60_000);
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}
