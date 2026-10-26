import type { ExitReason } from "@prisma/client";
import { getOfficeSettings, officeDayDate } from "@/lib/attendance";
import { PLAN_POSITION_TTL_MS } from "@/lib/positions";
import { prisma } from "@/lib/prisma";

// Where people are right now: on the office plan (IN_OFFICE) and in the city (OUT_OF_OFFICE).
// Polled by the office plan and the map every 3 seconds.

export type OfficePerson = {
  id: string;
  name: string;
  initials: string;
  x: number;
  y: number;
  moving: boolean;
  desk: string | null;
  /** Zone the person is in right now (kitchen, meeting room…), null — at the desk or between zones. */
  zone: string | null;
  /** Last attendance mark today: check-in or return. */
  lastMarkAt: string | null;
};
export type CityPerson = {
  id: string;
  name: string;
  initials: string;
  lat: number;
  lng: number;
  at: string;
  reason: ExitReason | null;
  requestTitle: string | null;
  /** When the employee went out. */
  exitAt: string | null;
};

type Rect = { name: string; x: number; y: number; width: number; height: number };

/** Which zone of the office plan contains a point (shares 0..1), if any. */
export function zoneAt(zones: Rect[], x: number, y: number) {
  return zones.find((z) => x >= z.x && x <= z.x + z.width && y >= z.y && y <= z.y + z.height)?.name ?? null;
}

const initials = (e: { firstName: string; lastName: string }) => `${e.firstName[0] ?? ""}${e.lastName[0] ?? ""}`;
const fullName = (e: { firstName: string; lastName: string }) => `${e.firstName} ${e.lastName}`;

export async function getSimulationEnabled() {
  const s = await prisma.officeSettings.findUnique({ where: { id: 1 }, select: { simulationEnabled: true } });
  return !!s?.simulationEnabled;
}

/** People in the office: the latest plan position if it is fresh, otherwise their desk. */
export async function getOfficePresence(): Promise<OfficePerson[]> {
  const date = officeDayDate(new Date(), await getOfficeSettings());
  const [zones, people] = await Promise.all([
    prisma.zone.findMany(),
    prisma.employee.findMany({
      where: { status: "IN_OFFICE", user: { isActive: true }, workDays: { some: { date, closed: false } } },
      include: {
        desk: true,
        workDays: {
          where: { date },
          include: { events: { where: { type: { in: ["CHECK_IN", "RETURN"] } }, orderBy: { at: "desc" }, take: 1 } },
        },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
  ]);

  return people.flatMap((e) => {
    const fresh = e.planAt && Date.now() - e.planAt.getTime() < PLAN_POSITION_TTL_MS && e.planX != null && e.planY != null;
    const pos = fresh ? { x: e.planX!, y: e.planY! } : e.desk && { x: e.desk.x, y: e.desk.y };
    if (!pos) return [];
    const day = e.workDays[0];
    return [
      {
        id: e.id,
        name: fullName(e),
        initials: initials(e),
        ...pos,
        moving: !!fresh,
        desk: e.desk?.code ?? null,
        zone: fresh ? zoneAt(zones, pos.x, pos.y) : null,
        lastMarkAt: (day?.events[0]?.at ?? day?.checkInAt)?.toISOString() ?? null,
      },
    ];
  });
}

/** People outside the office with their latest point today (ADMIN / MANAGER only — checked by the caller). */
export async function getCityPresence(): Promise<CityPerson[]> {
  const date = officeDayDate(new Date(), await getOfficeSettings());
  const people = await prisma.employee.findMany({
    where: { status: "OUT_OF_OFFICE", user: { isActive: true } },
    include: {
      workDays: {
        where: { date, closed: false },
        include: {
          locations: { orderBy: { at: "desc" }, take: 1 },
          events: { where: { type: "EXIT" }, orderBy: { at: "desc" }, take: 1, include: { request: true } },
        },
      },
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  return people.flatMap((e) => {
    const point = e.workDays[0]?.locations[0];
    if (!point) return []; // no location permission / no point yet: status only, no dot
    return [
      {
        id: e.id,
        name: fullName(e),
        initials: initials(e),
        lat: point.lat,
        lng: point.lng,
        at: point.at.toISOString(),
        reason: e.currentExitReason,
        requestTitle: e.workDays[0].events[0]?.request?.title ?? null,
        exitAt: e.workDays[0].events[0]?.at.toISOString() ?? null,
      },
    ];
  });
}
