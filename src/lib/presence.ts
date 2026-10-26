import type { ExitReason } from "@prisma/client";
import { getOfficeSettings, officeDayDate } from "@/lib/attendance";
import { PLAN_POSITION_TTL_MS } from "@/lib/positions";
import { prisma } from "@/lib/prisma";

// Where people are right now: on the office plan (IN_OFFICE) and in the city (OUT_OF_OFFICE).
// Polled by the office plan and the map every 3 seconds.

export type OfficePerson = { id: string; name: string; initials: string; x: number; y: number; moving: boolean };
export type CityPerson = {
  id: string;
  name: string;
  initials: string;
  lat: number;
  lng: number;
  at: string;
  reason: ExitReason | null;
  requestTitle: string | null;
};

const initials = (e: { firstName: string; lastName: string }) => `${e.firstName[0] ?? ""}${e.lastName[0] ?? ""}`;
const fullName = (e: { firstName: string; lastName: string }) => `${e.firstName} ${e.lastName}`;

export async function getSimulationEnabled() {
  const s = await prisma.officeSettings.findUnique({ where: { id: 1 }, select: { simulationEnabled: true } });
  return !!s?.simulationEnabled;
}

/** People in the office: the latest plan position if it is fresh, otherwise their desk. */
export async function getOfficePresence(): Promise<OfficePerson[]> {
  const date = officeDayDate(new Date(), await getOfficeSettings());
  const people = await prisma.employee.findMany({
    where: { status: "IN_OFFICE", user: { isActive: true }, workDays: { some: { date, closed: false } } },
    include: { desk: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  return people.flatMap((e) => {
    const fresh = e.planAt && Date.now() - e.planAt.getTime() < PLAN_POSITION_TTL_MS && e.planX != null && e.planY != null;
    const pos = fresh ? { x: e.planX!, y: e.planY! } : e.desk && { x: e.desk.x, y: e.desk.y };
    if (!pos) return [];
    return [{ id: e.id, name: fullName(e), initials: initials(e), ...pos, moving: !!fresh }];
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
      },
    ];
  });
}
