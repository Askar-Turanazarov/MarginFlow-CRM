import type { LocationSource } from "@prisma/client";
import { z } from "zod";
import { getOfficeSettings, officeDayDate } from "@/lib/attendance";
import { prisma } from "@/lib/prisma";
import { phoneMinIntervalMs } from "@/lib/track-math";

// The single place where every position arrives: the movement simulator, office sensors and phone geolocation.
// Rules (CLAUDE.md "Положение сотрудника"): positions are kept only between check-in and "End of work";
// a point on the office plan is accepted only while the employee is IN_OFFICE.

/** A position on the office plan is shown for this long; after that the employee is drawn at the desk. */
export const PLAN_POSITION_TTL_MS = 60_000;

export const positionSchema = z
  .object({
    employeeId: z.string().min(1).optional(),
    at: z.coerce.date().optional(),
    /** Office plan, shares 0..1 of the image width/height. */
    office: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).optional(),
    /** City, WGS84. accuracy — metres. */
    geo: z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        accuracy: z.number().min(0).max(100_000).optional(),
      })
      .optional(),
  })
  .refine((p) => p.office || p.geo, { message: "office or geo is required" });

export const positionsBodySchema = z.object({ positions: z.array(positionSchema).min(1).max(500) });

export type PositionInput = z.infer<typeof positionSchema> & { employeeId: string };
export type RejectReason = "unknownEmployee" | "offDuty" | "notInOffice" | "badTime" | "too_often";
export type IngestResult = { accepted: number; rejected: { employeeId: string; reason: RejectReason }[] };

export async function ingestPositions(source: LocationSource, positions: PositionInput[]): Promise<IngestResult> {
  const settings = await getOfficeSettings();
  const now = new Date();
  const date = officeDayDate(now, settings);

  const employees = await prisma.employee.findMany({
    where: { id: { in: [...new Set(positions.map((p) => p.employeeId))] } },
    select: {
      id: true,
      status: true,
      trackByPhone: true,
      workDays: {
        where: { date },
        select: {
          id: true,
          checkInAt: true,
          closed: true,
          locations: { where: { source }, orderBy: { at: "desc" }, take: 1, select: { at: true } },
        },
      },
    },
  });
  const byId = new Map(employees.map((e) => [e.id, e]));

  const result: IngestResult = { accepted: 0, rejected: [] };
  const lastPoint = new Map(employees.map((e) => [e.id, e.workDays[0]?.locations[0]?.at]));
  const planUpdates = new Map<string, { x: number; y: number; at: Date }>();
  const geoPoints: { workDayId: string; lat: number; lng: number; accuracy: number; source: LocationSource; at: Date }[] = [];

  for (const p of positions) {
    const reject = (reason: RejectReason) => result.rejected.push({ employeeId: p.employeeId, reason });
    const employee = byId.get(p.employeeId);
    if (!employee) {
      reject("unknownEmployee");
      continue;
    }
    // No open workday today → no tracking at all (also covers OFF_DUTY).
    const workDay = employee.workDays[0];
    if (employee.status === "OFF_DUTY" || !workDay || workDay.closed) {
      reject("offDuty");
      continue;
    }
    const at = p.at ?? now;
    if (at.getTime() > now.getTime() + 60_000 || at < workDay.checkInAt) {
      reject("badTime");
      continue;
    }
    if (p.office && employee.status !== "IN_OFFICE") {
      reject("notInOffice");
      continue;
    }

    // A phone reports at a set pace (tracked people every 10 s, others once a minute): anything faster is refused.
    if (source === "PHONE" && p.geo) {
      const previous = lastPoint.get(employee.id);
      if (previous && Math.abs(at.getTime() - previous.getTime()) < phoneMinIntervalMs(employee.trackByPhone)) {
        reject("too_often");
        continue;
      }
      lastPoint.set(employee.id, at);
    }

    if (p.office) planUpdates.set(employee.id, { ...p.office, at });
    if (p.geo) {
      geoPoints.push({ workDayId: workDay.id, lat: p.geo.lat, lng: p.geo.lng, accuracy: p.geo.accuracy ?? 0, source, at });
    }
    result.accepted++;
  }

  await prisma.$transaction([
    ...[...planUpdates].map(([id, pos]) =>
      prisma.employee.update({ where: { id }, data: { planX: pos.x, planY: pos.y, planAt: pos.at } }),
    ),
    ...(geoPoints.length ? [prisma.locationPoint.createMany({ data: geoPoints })] : []),
  ]);
  return result;
}
