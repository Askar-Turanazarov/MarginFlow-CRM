import type { Prisma, RequestStatus } from "@prisma/client";
import { getFormatter, getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import { isOverdue } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import { AssigneeSelect, StatusSelect, type AssigneeOption } from "./request-controls";

const STATUSES: RequestStatus[] = ["NEW", "ASSIGNED", "IN_PROGRESS", "DONE"];

export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireUser();
  const canManage = user.role !== "EMPLOYEE";
  const t = await getTranslations();
  const format = await getFormatter();

  const requested = (await searchParams).status;
  const status = STATUSES.find((s) => s === requested);

  // Employees see only requests assigned to them.
  const scope: Prisma.RequestWhereInput = canManage ? {} : { assigneeId: user.employeeId };
  const [requests, counts, employees] = await Promise.all([
    prisma.request.findMany({
      where: { ...scope, ...(status && { status }) },
      include: { client: true, assignee: true },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    }),
    prisma.request.groupBy({ by: ["status"], where: scope, _count: true }),
    canManage
      ? prisma.employee.findMany({
          where: { user: { isActive: true } },
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        })
      : [],
  ]);

  const countOf = (s?: RequestStatus) =>
    counts.filter((c) => !s || c.status === s).reduce((sum, c) => sum + c._count, 0);
  const options: AssigneeOption[] = employees.map((e) => ({ id: e.id, name: `${e.firstName} ${e.lastName}` }));
  const tabs: { key?: RequestStatus; label: string }[] = [
    { label: t("common.all") },
    ...STATUSES.map((s) => ({ key: s, label: t(`requestStatus.${s}`) })),
  ];

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{t("requests.title")}</h1>
        {canManage && (
          <Link href="/requests/new" className={`${buttonVariants()} ml-auto`}>
            {t("requests.add")}
          </Link>
        )}
      </div>
      {!canManage && <p className="text-sm text-muted-foreground">{t("requests.mine")}</p>}

      <nav className="flex flex-wrap gap-1" aria-label={t("requests.status")}>
        {tabs.map((tab) => (
          <Link
            key={tab.key ?? "all"}
            href={tab.key ? { pathname: "/requests", query: { status: tab.key } } : "/requests"}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm hover:bg-muted",
              tab.key === status && "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
            )}
          >
            {tab.label} <span className="opacity-70">{countOf(tab.key)}</span>
          </Link>
        ))}
      </nav>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("requests.request")}</TableHead>
                <TableHead>{t("requests.client")}</TableHead>
                <TableHead>{t("requests.assignee")}</TableHead>
                <TableHead>{t("requests.status")}</TableHead>
                <TableHead>{t("requests.due")}</TableHead>
                {canManage && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => {
                const overdue = isOverdue(r.dueDate, r.status);
                return (
                  <TableRow key={r.id} className={cn(overdue && "bg-destructive/5")}>
                    <TableCell className="max-w-72 whitespace-normal">
                      <div className="font-medium">{r.title}</div>
                      {r.description && <div className="text-xs text-muted-foreground">{r.description}</div>}
                    </TableCell>
                    <TableCell>
                      <div>{r.client.companyName}</div>
                      <div className="text-xs text-muted-foreground">{r.client.city}</div>
                    </TableCell>
                    <TableCell>
                      {canManage ? (
                        <AssigneeSelect id={r.id} value={r.assigneeId} options={options} />
                      ) : (
                        r.assignee && `${r.assignee.firstName} ${r.assignee.lastName}`
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusSelect id={r.id} value={r.status} assigned={!!r.assigneeId} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {r.dueDate && format.dateTime(r.dueDate, { dateStyle: "medium", timeZone: "UTC" })}
                      {overdue && (
                        <div className="text-xs font-medium text-destructive" data-testid="overdue">
                          {t("requests.overdue")}
                        </div>
                      )}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <Link href={`/requests/${r.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                          {t("common.edit")}
                        </Link>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {requests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    {t("requests.empty")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
