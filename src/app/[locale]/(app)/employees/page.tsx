import type { EmployeeStatus, Prisma } from "@prisma/client";
import { Armchair, Pencil, Plus, UserX, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState, ListCard, PageHeader, ResponsiveList } from "@/components/page";
import { SearchField } from "@/components/search-field";
import { StatusBadge } from "@/components/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";

const AVATAR_STATUS = { IN_OFFICE: "in", OUT_OF_OFFICE: "out", OFF_DUTY: "off" } as const satisfies Record<EmployeeStatus, string>;

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  const t = await getTranslations();
  const q = (await searchParams).q?.trim() ?? "";

  const where: Prisma.EmployeeWhereInput = {
    user: isAdmin ? { isNot: null } : { isActive: true },
    ...(q && {
      OR: (["firstName", "lastName", "position"] as const).map((field) => ({
        [field]: { contains: q, mode: "insensitive" as const },
      })),
    }),
  };
  const employees = await prisma.employee.findMany({
    where,
    include: { user: true, desk: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const editLink = (userId: string, compact = false) => (
    <Link
      href={`/employees/${userId}/edit`}
      className={buttonVariants({ variant: "ghost", size: compact ? "icon" : "sm" })}
      aria-label={t("employees.edit")}
    >
      <Pencil />
      {!compact && t("employees.edit")}
    </Link>
  );
  const deskLabel = (code?: string | null) => code ?? t("employees.noDesk");

  return (
    <div className="grid gap-5">
      <PageHeader
        title={t("employees.title")}
        count={employees.length}
        actions={
          isAdmin && (
            <Link href="/employees/new" className={buttonVariants()}>
              <Plus />
              {t("employees.add")}
            </Link>
          )
        }
      />

      <SearchField placeholder={t("employees.search")} defaultValue={q} />

      <ResponsiveList
        empty={employees.length === 0 && <EmptyState icon={Users} text={t("employees.empty")} className="surface rounded-2xl" />}
        table={
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("employees.name")}</TableHead>
                {isAdmin && <TableHead>{t("employees.login")}</TableHead>}
                <TableHead>{t("employees.role")}</TableHead>
                <TableHead>{t("employees.desk")}</TableHead>
                <TableHead>{t("employees.status")}</TableHead>
                {isAdmin && <TableHead>{t("employees.account")}</TableHead>}
                {isAdmin && <TableHead className="text-right">{t("employees.actions")}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((e) => (
                <TableRow key={e.id} className={cn(e.user && !e.user.isActive && "opacity-60")}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar id={e.id} name={`${e.firstName} ${e.lastName}`} size="md" status={AVATAR_STATUS[e.status]} />
                      <div className="min-w-0">
                        <div className="font-medium">
                          {e.firstName} {e.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">{e.position}</div>
                      </div>
                    </div>
                  </TableCell>
                  {isAdmin && <TableCell className="font-mono text-xs text-muted-foreground">{e.user?.login}</TableCell>}
                  <TableCell>{e.user && t(`roles.${e.user.role}`)}</TableCell>
                  <TableCell className="nums">{deskLabel(e.desk?.code)}</TableCell>
                  <TableCell>
                    <StatusBadge status={e.status} />
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Badge variant={e.user?.isActive ? "secondary" : "destructive"}>
                        {e.user?.isActive ? t("employees.active") : t("employees.inactive")}
                      </Badge>
                    </TableCell>
                  )}
                  {isAdmin && <TableCell className="text-right">{e.user && editLink(e.user.id)}</TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        }
        cards={employees.map((e) => (
          <ListCard key={e.id} className={cn(e.user && !e.user.isActive && "opacity-60")}>
            <div className="flex items-center gap-3">
              <Avatar id={e.id} name={`${e.firstName} ${e.lastName}`} size="md" status={AVATAR_STATUS[e.status]} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">
                  {e.firstName} {e.lastName}
                </div>
                <div className="truncate text-xs text-muted-foreground">{e.position}</div>
              </div>
              {isAdmin && e.user && editLink(e.user.id, true)}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <StatusBadge status={e.status} />
              <span className="inline-flex items-center gap-1">
                <Armchair className="size-3.5" />
                {deskLabel(e.desk?.code)}
              </span>
              {e.user && <span>· {t(`roles.${e.user.role}`)}</span>}
              {isAdmin && e.user && !e.user.isActive && (
                <Badge variant="destructive">
                  <UserX />
                  {t("employees.inactive")}
                </Badge>
              )}
            </div>
          </ListCard>
        ))}
      />
    </div>
  );
}
