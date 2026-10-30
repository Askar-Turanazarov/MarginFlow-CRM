import { NextResponse } from "next/server";
import { getCityPresence, getSimulationEnabled } from "@/lib/presence";
import { getCurrentUser } from "@/lib/session";
import { getTrackedPeople } from "@/lib/track";

/** City map: people outside the office. ADMIN and MANAGER only — employees do not see the map. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role === "EMPLOYEE") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const [simulation, people, tracked] = await Promise.all([getSimulationEnabled(), getCityPresence(), getTrackedPeople()]);
  return NextResponse.json({ simulation, people, tracked });
}
