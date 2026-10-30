import { NextResponse } from "next/server";
import { runRetention } from "@/lib/retention";
import { bearerMatches } from "@/lib/secret";

/** Daily cleanup. Vercel Cron calls it with "Authorization: Bearer <CRON_SECRET>". */
export async function GET(request: Request) {
  if (!bearerMatches(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await runRetention());
}
