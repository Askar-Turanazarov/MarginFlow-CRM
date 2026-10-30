import { after, NextResponse } from "next/server";
import { getCityPresence, getSimulationEnabled } from "@/lib/presence";
import { getCurrentUser } from "@/lib/session";
import { tickIfDue } from "@/lib/simulation/engine";
import { getTrackedPeople } from "@/lib/track";

/** City map: people outside the office. ADMIN and MANAGER only — employees do not see the map. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role === "EMPLOYEE") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (process.env.VERCEL) after(tickIfDue);
  const [simulation, people, tracked] = await Promise.all([getSimulationEnabled(), getCityPresence(), getTrackedPeople()]);
  return NextResponse.json({ simulation, people, tracked });
}
