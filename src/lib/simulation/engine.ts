import { Prisma, type ExitReason } from "@prisma/client";
import { getOfficeSettings, lateness, officeDayDate, workdayStartAt, type OfficeClock } from "@/lib/attendance";
import { ingestPositions, PLAN_POSITION_TTL_MS, type PositionInput } from "@/lib/positions";
import { prisma } from "@/lib/prisma";

// Movement simulator: one step every 3 seconds while OfficeSettings.simulationEnabled is on (npm run sim:on / sim:off, or the admin button).
// Locally a loop inside the server takes the steps (src/instrumentation.ts). Vercel has no always-on process, so there
// the polling routes take them (/api/presence): people move only while someone has the page open.
// Walkers live in the database, so any server instance can take the next step.
// For the demo it checks in everyone who has no workday today yet (checkInEveryone), then moves people
// and sends every position through ingestPositions() — the same entry point real sensors and phones use.

export const TICK_MS = 3_000;
// A little under the step: a timer firing slightly early must not skip its step.
const CLAIM_INTERVAL_MS = TICK_MS - 500;

type Point = { x: number; y: number };
type GeoPoint = { lat: number; lng: number };

// target null → standing; goingHome → walking back to the desk (its position is re-read every step).
type OfficeWalker = { kind: "office"; pos: Point; home: Point; target: Point | null; goingHome: boolean; atHome: boolean; wait: number };
type CityWalker = { kind: "city"; pos: GeoPoint; target: GeoPoint | null; toClient: boolean; wait: number };
type Walker = OfficeWalker | CityWalker;

// Office plan: share of the plan width per step. City: metres per step (sped up so movement is visible on the map).
const OFFICE_STEP = 0.07;
const DRIVE_STEP_M = 450;
const WALK_STEP_M = 120;
const WALK_RADIUS_M = 3_000;
const MAX_CLIENT_DISTANCE_M = 80_000; // clients in other cities (e.g. Tashkent) are not "driven" to

const state = globalThis as unknown as { __mfSimTimer?: NodeJS.Timeout };

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

function stepTowards(pos: Point, target: Point, step: number): { pos: Point; arrived: boolean } {
  const dx = target.x - pos.x;
  const dy = target.y - pos.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= step) return { pos: target, arrived: true };
  return { pos: { x: pos.x + (dx / dist) * step, y: pos.y + (dy / dist) * step }, arrived: false };
}

// Small distances only: a flat approximation around the current latitude is precise enough.
const M_PER_DEG_LAT = 111_320;
const mPerDegLng = (lat: number) => M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
const toMetres = (p: GeoPoint, origin: GeoPoint): Point => ({
  x: (p.lng - origin.lng) * mPerDegLng(origin.lat),
  y: (p.lat - origin.lat) * M_PER_DEG_LAT,
});
const distanceM = (a: GeoPoint, b: GeoPoint) => Math.hypot(toMetres(b, a).x, toMetres(b, a).y);

function geoStep(pos: GeoPoint, target: GeoPoint, stepM: number): { pos: GeoPoint; arrived: boolean } {
  const d = toMetres(target, pos);
  const { pos: m, arrived } = stepTowards({ x: 0, y: 0 }, d, stepM);
  if (arrived) return { pos: target, arrived };
  return { pos: { lat: pos.lat + m.y / M_PER_DEG_LAT, lng: pos.lng + m.x / mPerDegLng(pos.lat) }, arrived };
}

function randomGeoAround(center: GeoPoint, radiusM: number): GeoPoint {
  const r = radiusM * Math.sqrt(Math.random());
  const a = rand(0, 2 * Math.PI);
  return { lat: center.lat + (r * Math.sin(a)) / M_PER_DEG_LAT, lng: center.lng + (r * Math.cos(a)) / mPerDegLng(center.lat) };
}

/** Random point inside a zone, away from its borders, so people don't stack on one spot. */
const pointInZone = (z: { x: number; y: number; width: number; height: number }): Point => ({
  x: z.x + z.width * rand(0.2, 0.8),
  y: z.y + z.height * rand(0.25, 0.85),
});

/** Only one caller wins each step, however many tabs and server instances ask at the same moment. */
async function claimStep(now: Date) {
  const { count } = await prisma.officeSettings.updateMany({
    where: {
      id: 1,
      simulationEnabled: true,
      OR: [{ simulationTickAt: null }, { simulationTickAt: { lt: new Date(now.getTime() - CLAIM_INTERVAL_MS) } }],
    },
    data: { simulationTickAt: now },
  });
  return count === 1;
}

/** Takes a step if one is due. Never throws: a failed step must not break the request that triggered it. */
export async function tickIfDue() {
  try {
    if (await claimStep(new Date())) await tick();
  } catch (error) {
    console.error("[simulation] step failed:", error instanceof Error ? error.message : error);
  }
}

async function tick() {
  const settings = await prisma.officeSettings.findUnique({ where: { id: 1 } });
  if (!settings?.simulationEnabled) return;
  const walkers = new Map(Object.entries((settings.simulationState ?? {}) as Record<string, Walker>));
  const clock = await getOfficeSettings();
  const date = officeDayDate(new Date(), clock);
  const office: GeoPoint = { lat: settings.officeLat, lng: settings.officeLng };
  await checkInEveryone(clock, date);

  const [zones, people] = await Promise.all([
    prisma.zone.findMany({ where: { kind: { in: ["KITCHEN", "MEETING_ROOM"] } } }),
    // Only people with an open workday today; status decides office plan vs city.
    prisma.employee.findMany({
      where: {
        status: { in: ["IN_OFFICE", "OUT_OF_OFFICE"] },
        trackByPhone: false,
        user: { isActive: true },
        workDays: { some: { date, closed: false } },
      },
      include: {
        desk: true,
        workDays: {
          where: { date },
          include: {
            locations: { orderBy: { at: "desc" }, take: 1 },
            events: { where: { type: "EXIT" }, orderBy: { at: "desc" }, take: 1, include: { request: { include: { client: true } } } },
          },
        },
        requests: {
          where: { status: { in: ["ASSIGNED", "IN_PROGRESS"] }, client: { lat: { not: null }, lng: { not: null } } },
          include: { client: true },
          orderBy: { dueDate: "asc" },
        },
      },
    }),
  ]);

  const positions: PositionInput[] = [];
  const seen = new Set<string>();

  for (const e of people) {
    seen.add(e.id);
    const workDay = e.workDays[0];
    let walker = walkers.get(e.id);

    if (e.status === "IN_OFFICE") {
      const home = e.desk ? { x: e.desk.x, y: e.desk.y } : zones[0] && pointInZone(zones[0]);
      if (!home) continue; // no desk and no zones — nowhere to draw this person
      if (walker?.kind !== "office") {
        const fresh = e.planAt && Date.now() - e.planAt.getTime() < PLAN_POSITION_TTL_MS && e.planX != null && e.planY != null;
        walker = { kind: "office", pos: fresh ? { x: e.planX!, y: e.planY! } : home, home, target: null, goingHome: false, atHome: true, wait: randInt(1, 4) };
      }
      walker.home = home; // the desk may have been moved by the admin
      moveInOffice(walker, zones);
      positions.push({ employeeId: e.id, office: walker.pos });
    } else {
      if (walker?.kind !== "city") {
        const last = workDay?.locations[0];
        walker = { kind: "city", pos: last ? { lat: last.lat, lng: last.lng } : office, target: null, toClient: false, wait: 0 };
      }
      const exitRequest = workDay?.events[0]?.request;
      const client = clientTarget(exitRequest?.client ?? null, e.currentExitReason) ?? clientTarget(e.requests[0]?.client ?? null, e.currentExitReason);
      moveInCity(walker, client && distanceM(office, client) <= MAX_CLIENT_DISTANCE_M ? client : null, office);
      positions.push({ employeeId: e.id, geo: { ...walker.pos, accuracy: 10 } });
    }
    walkers.set(e.id, walker);
  }

  for (const id of walkers.keys()) if (!seen.has(id)) walkers.delete(id);
  if (positions.length) await ingestPositions("SIMULATOR", positions);
  await prisma.officeSettings.updateMany({
    where: { id: 1, simulationEnabled: true },
    data: { simulationState: Object.fromEntries(walkers) as Prisma.InputJsonObject },
  });
}

/**
 * Demo: everyone active who has no workday today "arrives" at the office (CHECK_IN, status IN_OFFICE).
 * Arrival is a random time around the workday start (±20 min, so some are late), never in the future.
 * People who already ended their day are left alone — they have a (closed) workday.
 */
async function checkInEveryone(clock: OfficeClock, date: Date) {
  const absent = await prisma.employee.findMany({
    where: { trackByPhone: false, user: { isActive: true }, workDays: { none: { date } } },
    select: { id: true, user: { select: { id: true } } },
  });
  const now = new Date();
  const start = workdayStartAt(now, clock).getTime();
  for (const e of absent) {
    if (!e.user) continue;
    const at = new Date(Math.min(now.getTime(), start + randInt(-20, 20) * 60_000 + randInt(0, 59) * 1_000));
    try {
      await prisma.$transaction([
        prisma.workDay.create({
          data: {
            employeeId: e.id,
            date,
            checkInAt: at,
            ...lateness(at, clock),
            events: { create: { type: "CHECK_IN", at, createdById: e.user.id } },
          },
        }),
        prisma.employee.update({ where: { id: e.id }, data: { status: "IN_OFFICE", currentExitReason: null } }),
      ]);
    } catch (error) {
      // The employee pressed "I'm here" at the same moment — their own check-in wins.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
    }
  }
}

/** Lunch or personal errands — just a walk; client visit and meetings — to the client of the request. */
function clientTarget(client: { lat: number | null; lng: number | null } | null, reason: ExitReason | null): GeoPoint | null {
  if (!client || client.lat == null || client.lng == null) return null;
  if (reason === "LUNCH" || reason === "PERSONAL") return null;
  return { lat: client.lat, lng: client.lng };
}

function moveInOffice(w: OfficeWalker, zones: { x: number; y: number; width: number; height: number }[]) {
  if (w.wait > 0) {
    w.wait--;
    return;
  }
  if (!w.target) {
    // At the desk → go to a random kitchen / meeting room point; anywhere else → back to the desk.
    w.goingHome = !(w.atHome && zones.length);
    if (!w.goingHome) w.target = pointInZone(zones[randInt(0, zones.length - 1)]);
  }
  if (w.goingHome) w.target = w.home;
  const { pos, arrived } = stepTowards(w.pos, w.target!, OFFICE_STEP);
  w.pos = pos;
  if (arrived) {
    w.atHome = w.goingHome;
    w.target = null;
    w.wait = w.atHome ? randInt(3, 8) : randInt(2, 5);
  }
}

function moveInCity(w: CityWalker, client: GeoPoint | null, office: GeoPoint) {
  if (w.wait > 0) {
    w.wait--;
    // Standing at the client — small jitter like a real GPS.
    if (w.toClient) w.pos = randomGeoAround(w.pos, 8);
    return;
  }
  if (client && (!w.toClient || !w.target)) {
    w.target = client;
    w.toClient = true;
  } else if (!client && (w.toClient || !w.target)) {
    w.target = randomGeoAround(w.toClient ? w.pos : office, WALK_RADIUS_M);
    w.toClient = false;
  }
  const { pos, arrived } = geoStep(w.pos, w.target!, w.toClient ? DRIVE_STEP_M : WALK_STEP_M);
  w.pos = pos;
  if (arrived) {
    w.wait = w.toClient ? randInt(10, 20) : randInt(1, 3);
    if (!w.toClient) w.target = null; // next random point
  }
}

/** Starts the 3-second loop once per server process (dev hot reload re-imports this module). */
export function startSimulationLoop() {
  if (state.__mfSimTimer) return;
  let running = false;
  state.__mfSimTimer = setInterval(async () => {
    if (running) return; // a slow step must not overlap the next one
    running = true;
    await tickIfDue();
    running = false;
  }, TICK_MS);
}

export async function setSimulationEnabled(enabled: boolean) {
  const data = { simulationEnabled: enabled, simulationState: Prisma.DbNull, simulationTickAt: null };
  await prisma.officeSettings.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
}
