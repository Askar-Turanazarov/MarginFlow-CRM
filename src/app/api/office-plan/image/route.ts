import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// Uploaded office plan image; only for signed-in users.
export async function GET() {
  if (!(await getCurrentUser())) return new Response("Unauthorized", { status: 401 });

  const plan = await prisma.officePlan.findUnique({ where: { id: 1 } });
  if (!plan?.image || !plan.mimeType) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(plan.image), {
    headers: {
      "Content-Type": plan.mimeType,
      "X-Content-Type-Options": "nosniff",
      // The URL carries ?v=<updatedAt>, so a new upload gets a new URL.
      "Cache-Control": "private, max-age=86400",
    },
  });
}
