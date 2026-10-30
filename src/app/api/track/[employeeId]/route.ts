import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getTrack, recordTrackView } from "@/lib/track";

/** Live position of one tracked employee. ADMIN and MANAGER only, like the city map. Viewing is logged. */
export async function GET(_req: Request, { params }: { params: Promise<{ employeeId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role === "EMPLOYEE") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { employeeId } = await params;
  const track = await getTrack(employeeId);
  if (!track) return NextResponse.json({ error: "notFound" }, { status: 404 });
  await recordTrackView(user.id, employeeId);
  return NextResponse.json(track);
}
