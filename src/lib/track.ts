import type { AttendanceEventType, EmployeeStatus, ExitReason } from "@prisma/client";
import { getOfficeSettings, officeDayDate } from "@/lib/attendance";
import { prisma } from "@/lib/prisma";
import { currentSpeedKmh, trackDistanceMeters } from "@/lib/track-math";

// Live tracking page: everything about one trackByPhone employee today. ADMIN / MANAGER only — checked by the caller.

export type TrackEvent = { id: string; type: AttendanceEventType; reason: ExitReason | null; at: string };
export type TrackData = {
  id: string;
  name: string;
  initials: string;
  position: string;
  status: EmployeeStatus;
  checkInAt: string | null;
  events: TrackEvent[];
  /** Today's path since check-in, oldest first. */
  path: [number, number][];
  last: { lat: number; lng: number; accuracy: number; at: string } | null;
  /** Age of the last point when the server answered, so a wrong clock on the viewer's computer does not matter. */
  lastAgeMs: number | null;
  distanceM: number;
  speedKmh: number | null;
};
export type TrackedPerson = { id: string; name: string; status: EmployeeStatus };

export async function getTrackedPeople(): Promise<TrackedPerson[]> {
  const people = await prisma.employee.findMany({
    where: { trackByPhone: true, user: { isActive: true } },
    select: { id: true, firstName: true, lastName: true, status: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
  return people.map((e) => ({ id: e.id, name: `${e.firstName} ${e.lastName}`, status: e.status }));
}

const VIEW_LOG_INTERVAL_MS = 60 * 60_000;
const VIEW_ACTION = "track.view";

/** Who looked at whose real location. The page polls every few seconds, so at most one row per hour for a viewer + employee. */
export async function recordTrackView(viewerId: string, employeeId: string) {
  const recent = await prisma.auditLog.findFirst({
    where: { action: VIEW_ACTION, actor: viewerId, targetId: employeeId, at: { gte: new Date(Date.now() - VIEW_LOG_INTERVAL_MS) } },
    select: { id: true },
  });
  if (!recent) await prisma.auditLog.create({ data: { actor: viewerId, action: VIEW_ACTION, targetId: employeeId } });
}

export async function getTrackViews(employeeId: string, take = 20) {
  const views = await prisma.auditLog.findMany({
    where: { action: VIEW_ACTION, targetId: employeeId },
    orderBy: { at: "desc" },
    take,
  });
  const viewers = await prisma.user.findMany({
    where: { id: { in: views.map((v) => v.actor) } },
    select: { id: true, employee: { select: { firstName: true, lastName: true } } },
  });
  const names = new Map(viewers.map((u) => [u.id, `${u.employee.firstName} ${u.employee.lastName}`]));
  return views.map((v) => ({ id: v.id, at: v.at, name: names.get(v.actor) ?? v.actor }));
}

/** null — no such employee, or they are not marked for tracking. */
export async function getTrack(employeeId: string): Promise<TrackData | null> {
  const date = officeDayDate(new Date(), await getOfficeSettings());
  const e = await prisma.employee.findFirst({
    where: { id: employeeId, trackByPhone: true, user: { isActive: true } },
    include: {
      workDays: {
        where: { date },
        include: {
          events: { orderBy: { at: "asc" } },
          locations: { orderBy: { at: "asc" }, select: { lat: true, lng: true, accuracy: true, at: true } },
        },
      },
    },
  });
  if (!e) return null;

  const day = e.workDays[0];
  const points = (day?.locations ?? []).map((p) => ({ ...p, at: p.at.getTime() }));
  const last = points.at(-1);
  return {
    id: e.id,
    name: `${e.firstName} ${e.lastName}`,
    initials: `${e.firstName[0] ?? ""}${e.lastName[0] ?? ""}`,
    position: e.position,
    status: e.status,
    checkInAt: day?.checkInAt.toISOString() ?? null,
    events: (day?.events ?? []).map((ev) => ({ id: ev.id, type: ev.type, reason: ev.reason, at: ev.at.toISOString() })),
    path: points.map((p) => [p.lat, p.lng]),
    last: last ? { lat: last.lat, lng: last.lng, accuracy: last.accuracy, at: new Date(last.at).toISOString() } : null,
    lastAgeMs: last ? Date.now() - last.at : null,
    distanceM: trackDistanceMeters(points),
    speedKmh: currentSpeedKmh(points),
  };
}
