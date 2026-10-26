import { NextResponse } from "next/server";
import { getAdminDashboard } from "@/lib/dashboard";
import { getCurrentUser } from "@/lib/session";

/** Numbers and activity feed of the ADMIN dashboard. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json(await getAdminDashboard());
}
