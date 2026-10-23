import type { Prisma } from "@prisma/client";
import { getLocale, getTranslations } from "next-intl/server";
import { ClientsMap, type ClientPoint } from "@/components/map";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireUser();
  const canEdit = user.role !== "EMPLOYEE";
  const t = await getTranslations();
  const locale = await getLocale();
  const q = (await searchParams).q?.trim() ?? "";

  const where: Prisma.ClientWhereInput = q
    ? {
        OR: (["companyName", "contactName", "city"] as const).map((field) => ({
          [field]: { contains: q, mode: "insensitive" as const },
        })),
      }
    : {};
  const clients = await prisma.client.findMany({
    where,
    include: { _count: { select: { requests: { where: { status: { not: "DONE" } } } } } },
    orderBy: { companyName: "asc" },
  });

  const points: ClientPoint[] = clients.flatMap((c) =>
    c.lat !== null && c.lng !== null
      ? [
          {
            id: c.id,
            companyName: c.companyName,
            city: c.city,
            lat: c.lat,
            lng: c.lng,
            href: canEdit ? `/${locale}/clients/${c.id}/edit` : undefined,
          },
        ]
      : [],
  );

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{t("clients.title")}</h1>
        <span className="text-muted-foreground">{clients.length}</span>
        {canEdit && (
          <Link href="/clients/new" className={`${buttonVariants()} ml-auto`}>
            {t("clients.add")}
          </Link>
        )}
      </div>

      <form className="flex max-w-md gap-2">
        <Input name="q" defaultValue={q} placeholder={t("clients.search")} />
        <Button type="submit" variant="outline">
          {t("clients.find")}
        </Button>
      </form>

      <div className="h-80 overflow-hidden rounded-xl border">
        <ClientsMap points={points} />
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("clients.company")}</TableHead>
                <TableHead>{t("clients.contact")}</TableHead>
                <TableHead>{t("clients.phone")}</TableHead>
                <TableHead>{t("clients.city")}</TableHead>
                <TableHead>{t("clients.address")}</TableHead>
                <TableHead>{t("clients.requests")}</TableHead>
                {canEdit && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.companyName}</TableCell>
                  <TableCell>{c.contactName}</TableCell>
                  <TableCell className="whitespace-nowrap">{c.phone}</TableCell>
                  <TableCell>{c.city}</TableCell>
                  <TableCell className="max-w-64 truncate" title={c.address ?? undefined}>
                    {c.address}
                    {c.lat === null && <span className="text-xs text-muted-foreground"> · {t("clients.noLocation")}</span>}
                  </TableCell>
                  <TableCell>{c._count.requests}</TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <Link href={`/clients/${c.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                        {t("common.edit")}
                      </Link>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {clients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    {t("clients.empty")}
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
