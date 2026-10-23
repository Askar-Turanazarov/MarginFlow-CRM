import { prisma } from "@/lib/prisma";
import type { AssigneeOption } from "./request-controls";

/** Clients and active employees for the request form selects. */
export async function loadRequestFormOptions() {
  const [clients, employees] = await Promise.all([
    prisma.client.findMany({ select: { id: true, companyName: true, city: true }, orderBy: { companyName: "asc" } }),
    prisma.employee.findMany({
      where: { user: { isActive: true } },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
  ]);
  const options: AssigneeOption[] = employees.map((e) => ({ id: e.id, name: `${e.firstName} ${e.lastName}` }));
  return { clients, employees: options };
}
