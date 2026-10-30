import { prisma } from "@/lib/prisma";

const DAY_MS = 86_400_000;
const RATE_LIMIT_TTL_MS = DAY_MS;

export function retentionCutoff(now: Date, days: number) {
  return new Date(now.getTime() - days * DAY_MS);
}

/** Daily cleanup: real coordinates are not kept longer than the setting says. Reports count events, not points. */
export async function runRetention(now = new Date()) {
  const settings = await prisma.officeSettings.findUnique({ where: { id: 1 }, select: { locationRetentionDays: true } });
  const [points, limits] = await prisma.$transaction([
    prisma.locationPoint.deleteMany({ where: { at: { lt: retentionCutoff(now, settings?.locationRetentionDays ?? 30) } } }),
    prisma.rateLimit.deleteMany({ where: { windowStart: { lt: new Date(now.getTime() - RATE_LIMIT_TTL_MS) } } }),
  ]);
  return { points: points.count, rateLimits: limits.count };
}
