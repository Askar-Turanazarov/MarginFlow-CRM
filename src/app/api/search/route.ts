import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const LIMIT = 6;

/** Ctrl+K search: people, clients and requests. Employees find only requests assigned to them. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 60) ?? "";
  if (q.length < 2) return NextResponse.json({ employees: [], clients: [], requests: [] });

  const has = { contains: q, mode: "insensitive" } as const;
  const requestScope: Prisma.RequestWhereInput = user.role === "EMPLOYEE" ? { assigneeId: user.employeeId } : {};

  const [employees, clients, requests] = await Promise.all([
    prisma.employee.findMany({
      where: { OR: [{ firstName: has }, { lastName: has }, { position: has }] },
      select: { id: true, firstName: true, lastName: true, position: true, status: true },
      take: LIMIT,
    }),
    prisma.client.findMany({
      where: { OR: [{ companyName: has }, { contactName: has }] },
      select: { id: true, companyName: true, contactName: true },
      take: LIMIT,
    }),
    prisma.request.findMany({
      where: { ...requestScope, OR: [{ title: has }, { client: { companyName: has } }] },
      select: { id: true, title: true, status: true, client: { select: { companyName: true } } },
      take: LIMIT,
    }),
  ]);

  return NextResponse.json({
    employees: employees.map((e) => ({ id: e.id, name: `${e.firstName} ${e.lastName}`, hint: e.position, status: e.status })),
    clients: clients.map((c) => ({ id: c.id, name: c.companyName, hint: c.contactName })),
    requests: requests.map((r) => ({ id: r.id, name: r.title, hint: r.client.companyName, status: r.status })),
  });
}
