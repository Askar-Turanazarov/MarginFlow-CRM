import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { ingestPositions, positionsBodySchema, type PositionInput } from "@/lib/positions";
import { rejectOverLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/session";

const MAX_BODY_BYTES = 256 * 1024;
const PHONE_REQUESTS_PER_MINUTE = 20;

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// Entry point for real devices (see src/lib/positions.ts):
//   office sensors / trackers: Authorization: Bearer <POSITIONS_API_TOKEN from .env>, any employee;
//   phone in the browser: the signed-in session, only the user's own positions.
// Body: { "positions": [{ "employeeId": "...", "at"?: ISO, "office"?: { x, y }, "geo"?: { lat, lng, accuracy? } }] }

function isSensorToken(header: string | null): boolean {
  const expected = process.env.POSITIONS_API_TOKEN;
  if (!expected || expected === "change-me" || expected.length < 16) return false; // sensors disabled until a real token is set
  const given = header?.match(/^Bearer (.+)$/)?.[1];
  if (!given) return false;
  // Compare hashes: equal length for timingSafeEqual and no early exit on the first different character.
  const hash = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(hash(given), hash(expected));
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const sensor = isSensorToken(authHeader);
  const user = sensor ? null : await getCurrentUser();
  if (!sensor && !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (user) {
    const limited = await rejectOverLimit(`positions:${user.id}`, PHONE_REQUESTS_PER_MINUTE);
    if (limited) return limited;
  }

  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "tooLarge" }, { status: 413 });
  }
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return NextResponse.json({ error: "tooLarge" }, { status: 413 });
  const body = positionsBodySchema.safeParse(parseJson(text));
  if (!body.success) return NextResponse.json({ error: "invalidBody", issues: body.error.issues }, { status: 400 });

  let positions: PositionInput[];
  if (sensor) {
    if (body.data.positions.some((p) => !p.employeeId)) {
      return NextResponse.json({ error: "employeeIdRequired" }, { status: 400 });
    }
    positions = body.data.positions as PositionInput[];
  } else {
    // A phone reports only its owner's location, one point at a time, and only in the city (office plan points come from sensors).
    if (body.data.positions.length > 1 || body.data.positions.some((p) => (p.employeeId && p.employeeId !== user!.employeeId) || p.office)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    // The time is the server's: a client-sent "at" could slip past the too_often check and rewrite the route.
    positions = body.data.positions.map((p) => ({ geo: p.geo, employeeId: user!.employeeId }));
  }

  return NextResponse.json(await ingestPositions(sensor ? "SENSOR" : "PHONE", positions));
}
