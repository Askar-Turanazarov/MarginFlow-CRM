import { after, NextResponse } from "next/server";
import { getOfficePresence, getSimulationEnabled } from "@/lib/presence";
import { getCurrentUser } from "@/lib/session";
import { tickIfDue } from "@/lib/simulation/engine";

/** Office plan positions for every signed-in user (employees see colleagues in the office, not the city). */
export async function GET() {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (process.env.VERCEL) after(tickIfDue);
  const [simulation, office] = await Promise.all([getSimulationEnabled(), getOfficePresence()]);
  return NextResponse.json({ simulation, office });
}
