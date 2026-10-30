import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getTrack } from "@/lib/track";

/** Live position of one tracked employee. ADMIN and MANAGER only, like the city map. */
export async function GET(_req: Request, { params }: { params: Promise<{ employeeId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role === "EMPLOYEE") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const track = await getTrack((await params).employeeId);
  if (!track) return NextResponse.json({ error: "notFound" }, { status: 404 });
  return NextResponse.json(track);
}
