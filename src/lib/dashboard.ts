import type { ExitReason } from "@prisma/client";
import { getOfficeSettings, isWorkingDay, officeDayDate } from "@/lib/attendance";
import { prisma } from "@/lib/prisma";

// ADMIN dashboard: today's numbers and the activity feed. Polled every 3 seconds (GET /api/dashboard).

export type DashboardStats = {
  inOffice: number;
  outOfOffice: number;
  notArrived: number;
  late: number;
  requestsInWork: number;
  requestsNew: number;
};

export type FeedItem = {
  id: string;
  kind: "CHECK_IN" | "EXIT" | "RETURN" | "END_OF_DAY" | "ASSIGNED";
  at: string;
  name: string;
  reason?: ExitReason | null;
  request?: string | null;
  client?: string | null;
  lateMinutes?: number;
};

export type AdminDashboard = { stats: DashboardStats; feed: FeedItem[] };

const FEED_SIZE = 15;
const fullName = (e: { firstName: string; lastName: string }) => `${e.firstName} ${e.lastName}`;

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const settings = await getOfficeSettings();
  const now = new Date();
  const date = officeDayDate(now, settings);
  const active = { isActive: true };
  // Admins don't check in, so they are not counted as "not arrived" or "late".
  const staff = { isActive: true, role: { not: "ADMIN" as const } };

  const [statuses, notArrived, late, requests, events, assigned] = await Promise.all([
    prisma.employee.groupBy({ by: ["status"], where: { user: active }, _count: true }),
    isWorkingDay(now, settings) ? prisma.employee.count({ where: { user: staff, workDays: { none: { date } } } }) : 0,
    prisma.workDay.count({ where: { date, isLate: true, employee: { user: staff } } }),
    prisma.request.groupBy({ by: ["status"], _count: true }),
    prisma.attendanceEvent.findMany({
      orderBy: { at: "desc" },
      take: FEED_SIZE,
      include: { workDay: { include: { employee: true } }, request: { include: { client: true } } },
    }),
    prisma.request.findMany({
      where: { assignedAt: { not: null }, assigneeId: { not: null } },
      orderBy: { assignedAt: "desc" },
      take: FEED_SIZE,
      include: { assignee: true, client: true },
    }),
  ]);

  const byStatus = (s: string) => statuses.find((g) => g.status === s)?._count ?? 0;
  const byRequest = (s: string) => requests.find((g) => g.status === s)?._count ?? 0;

  const feed: FeedItem[] = [
    ...events.map((e) => ({
      id: e.id,
      kind: e.type,
      at: e.at.toISOString(),
      name: fullName(e.workDay.employee),
      reason: e.reason,
      request: e.request?.title ?? null,
      client: e.request?.client.companyName ?? null,
      ...(e.type === "CHECK_IN" && { lateMinutes: e.workDay.lateMinutes }),
    })),
    ...assigned.map((r) => ({
      id: `assigned-${r.id}`,
      kind: "ASSIGNED" as const,
      at: r.assignedAt!.toISOString(),
      name: fullName(r.assignee!),
      request: r.title,
      client: r.client.companyName,
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, FEED_SIZE);

  return {
    stats: {
      inOffice: byStatus("IN_OFFICE"),
      outOfOffice: byStatus("OUT_OF_OFFICE"),
      notArrived,
      late,
      requestsInWork: byRequest("ASSIGNED") + byRequest("IN_PROGRESS"),
      requestsNew: byRequest("NEW"),
    },
    feed,
  };
}
