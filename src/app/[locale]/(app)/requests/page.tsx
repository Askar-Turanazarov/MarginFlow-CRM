import type { Prisma, Request, RequestStatus } from "@prisma/client";
import { CalendarClock, ClipboardList, Pencil, Plus } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { LinkTabs, type LinkTab } from "@/components/link-tabs";
import { EmptyState, ListCard, PageHeader, ResponsiveList } from "@/components/page";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
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
  const tabs: LinkTab[] = [
    { key: "all", href: "/requests", label: t("common.all"), count: countOf() },
    ...STATUSES.map((s) => ({
      key: s,
      href: { pathname: "/requests", query: { status: s } },
      label: t(`requestStatus.${s}`),
      count: countOf(s),
    })),
  ];

  const due = (r: Request, overdue: boolean) =>
    r.dueDate && (
      <span className={cn("nums inline-flex items-center gap-1.5 whitespace-nowrap", overdue ? "font-medium text-sig-late" : "text-muted-foreground")}>
        <CalendarClock className="size-3.5" />
        {format.dateTime(r.dueDate, { dateStyle: "medium", timeZone: "UTC" })}
        {overdue && <span data-testid="overdue">· {t("requests.overdue")}</span>}
      </span>
    );
  const assignee = (r: (typeof requests)[number]) =>
    canManage ? (
      <AssigneeSelect id={r.id} value={r.assigneeId} options={options} />
    ) : (
      r.assignee && (
        <span className="inline-flex items-center gap-2">
          <Avatar id={r.assignee.id} name={`${r.assignee.firstName} ${r.assignee.lastName}`} size="xs" />
          {r.assignee.firstName} {r.assignee.lastName}
        </span>
      )
    );
  const editLink = (id: string, compact = false) => (
    <Link href={`/requests/${id}/edit`} className={buttonVariants({ variant: "ghost", size: compact ? "icon" : "sm" })} aria-label={t("common.edit")}>
      <Pencil />
      {!compact && t("common.edit")}
    </Link>
  );

  return (
    <div className="grid gap-5">
      <PageHeader
        title={t("requests.title")}
        description={!canManage && t("requests.mine")}
        actions={
          canManage && (
            <Link href="/requests/new" className={buttonVariants()}>
              <Plus />
              {t("requests.add")}
            </Link>
          )
        }
      />

      <LinkTabs tabs={tabs} active={status ?? "all"} label={t("requests.status")} />

      <ResponsiveList
        empty={requests.length === 0 && <EmptyState icon={ClipboardList} text={t("requests.empty")} className="surface rounded-2xl" />}
        table={
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
                  <TableRow key={r.id} className={cn(overdue && "bg-sig-late/[.05] hover:bg-sig-late/[.08]")}>
                    <TableCell className="max-w-80 whitespace-normal">
                      <div className="font-medium">{r.title}</div>
                      {r.description && <div className="line-clamp-2 text-xs text-muted-foreground">{r.description}</div>}
                    </TableCell>
                    <TableCell>
                      <div>{r.client.companyName}</div>
                      <div className="text-xs text-muted-foreground">{r.client.city}</div>
                    </TableCell>
                    <TableCell>{assignee(r)}</TableCell>
                    <TableCell>
                      <StatusSelect id={r.id} value={r.status} assigned={!!r.assigneeId} />
                    </TableCell>
                    <TableCell>{due(r, overdue)}</TableCell>
                    {canManage && <TableCell className="text-right">{editLink(r.id)}</TableCell>}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        }
        cards={requests.map((r) => {
          const overdue = isOverdue(r.dueDate, r.status);
          return (
            <ListCard key={r.id} className={cn(overdue && "ring-1 ring-sig-late/30")}>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{r.title}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {r.client.companyName}
                    {r.client.city && ` · ${r.client.city}`}
                  </div>
                </div>
                {canManage && editLink(r.id, true)}
              </div>
              {r.description && <p className="line-clamp-2 text-sm text-muted-foreground">{r.description}</p>}
              <div className="grid gap-2 min-[400px]:grid-cols-2">
                <StatusSelect id={r.id} value={r.status} assigned={!!r.assigneeId} />
                <div className="min-w-0 self-center text-sm">{assignee(r)}</div>
              </div>
              {due(r, overdue)}
            </ListCard>
          );
        })}
      />
    </div>
  );
}
