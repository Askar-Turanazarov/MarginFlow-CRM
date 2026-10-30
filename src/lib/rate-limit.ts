import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Fixed-window limits kept in PostgreSQL, so they hold across serverless instances and need no extra service.

export const MINUTE_MS = 60_000;

/** Counts one attempt in a single atomic statement. false — over the limit. */
export async function hit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const [row] = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "windowStart")
    VALUES (${key}, 1, now())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."windowStart" <= now() - ${windowMs}::double precision * interval '1 millisecond' THEN 1 ELSE "RateLimit"."count" + 1 END,
      "windowStart" = CASE WHEN "RateLimit"."windowStart" <= now() - ${windowMs}::double precision * interval '1 millisecond' THEN now() ELSE "RateLimit"."windowStart" END
    RETURNING "count"`;
  return row.count <= limit;
}

export async function resetLimit(key: string) {
  await prisma.rateLimit.deleteMany({ where: { key } });
}

/** A ready 429 answer for API routes, or null when the request may go on. */
export async function rejectOverLimit(key: string, limit: number, windowMs = MINUTE_MS) {
  if (await hit(key, limit, windowMs)) return null;
  return NextResponse.json({ error: "tooManyRequests" }, { status: 429, headers: { "Retry-After": String(Math.ceil(windowMs / 1000)) } });
}

/** Vercel sets x-forwarded-for itself, so it can be trusted there. Elsewhere anyone could forge it. */
export function clientIp(headers: Headers) {
  if (!process.env.VERCEL) return "local";
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
