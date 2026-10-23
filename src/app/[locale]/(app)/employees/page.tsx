import type { Prisma } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

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

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{t("employees.title")}</h1>
        <span className="text-muted-foreground">{employees.length}</span>
        {isAdmin && (
          <Link href="/employees/new" className={`${buttonVariants()} ml-auto`}>
            {t("employees.add")}
          </Link>
        )}
      </div>

      <form className="flex max-w-md gap-2">
        <Input name="q" defaultValue={q} placeholder={t("employees.search")} />
        <Button type="submit" variant="outline">
          {t("employees.find")}
        </Button>
      </form>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("employees.name")}</TableHead>
                <TableHead>{t("employees.position")}</TableHead>
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
                <TableRow key={e.id}>
                  <TableCell className="font-medium">
                    {e.firstName} {e.lastName}
                  </TableCell>
                  <TableCell>{e.position}</TableCell>
                  {isAdmin && <TableCell className="font-mono text-xs">{e.user?.login}</TableCell>}
                  <TableCell>{e.user && t(`roles.${e.user.role}`)}</TableCell>
                  <TableCell>{e.desk?.code ?? t("employees.noDesk")}</TableCell>
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
                  {isAdmin && (
                    <TableCell className="text-right">
                      {e.user && (
                        <Link
                          href={`/employees/${e.user.id}/edit`}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          {t("employees.edit")}
                        </Link>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {employees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    {t("employees.empty")}
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
