import type { WorkDay } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CurrentUser } from "@/lib/session";
import type { DayState, MyRequest } from "./day-controls";

/** What the day buttons need: current status and the user's open requests (to attach to a client visit). */
export async function getDayData(user: CurrentUser, workDay: WorkDay | null): Promise<{ state: DayState; requests: MyRequest[] }> {
  const open = !!workDay && !workDay.closed;
  const requests = open
    ? await prisma.request.findMany({
        where: { assigneeId: user.employeeId, status: { in: ["ASSIGNED", "IN_PROGRESS"] } },
        select: { id: true, title: true, client: { select: { companyName: true } } },
        orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
      })
    : [];
  return {
    state: { status: user.employee.status, reason: user.employee.currentExitReason, open },
    requests: requests.map((r) => ({ id: r.id, title: r.title, client: r.client.companyName })),
  };
}
