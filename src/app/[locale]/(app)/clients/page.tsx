import type { Prisma } from "@prisma/client";
import { Building2, MapPin, MapPinOff, Pencil, Phone, Plus } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { ClientsMap, type ClientPoint } from "@/components/map";
import { EmptyState, ListCard, PageHeader, ResponsiveList } from "@/components/page";
import { SearchField } from "@/components/search-field";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
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

  const openRequests = (n: number) => (n > 0 ? <Badge variant="info">{n}</Badge> : <span className="text-muted-foreground">—</span>);
  const phoneLink = (phone: string) => (
    <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="nums transition-colors hover:text-primary">
      {phone}
    </a>
  );

  return (
    <div className="grid gap-5">
      <PageHeader
        title={t("clients.title")}
        count={clients.length}
        actions={
          canEdit && (
            <Link href="/clients/new" className={buttonVariants()}>
              <Plus />
              {t("clients.add")}
            </Link>
          )
        }
      />

      <SearchField placeholder={t("clients.search")} defaultValue={q} />

      <Reveal index={1}>
        <div className="glass h-72 overflow-hidden rounded-2xl p-1.5 sm:h-80">
          <div className="isolate h-full overflow-hidden rounded-[0.875rem]">
            <ClientsMap points={points} />
          </div>
        </div>
      </Reveal>

      <ResponsiveList
        empty={clients.length === 0 && <EmptyState icon={Building2} text={t("clients.empty")} className="surface rounded-2xl" />}
        table={
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("clients.company")}</TableHead>
                <TableHead>{t("clients.phone")}</TableHead>
                <TableHead>{t("clients.address")}</TableHead>
                <TableHead>{t("clients.requests")}</TableHead>
                {canEdit && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="font-medium">{c.companyName}</div>
                    <div className="text-xs text-muted-foreground">{c.contactName}</div>
                  </TableCell>
                  <TableCell>{c.phone && phoneLink(c.phone)}</TableCell>
                  <TableCell className="max-w-72">
                    <div className="truncate" title={c.address ?? undefined}>
                      {c.city}
                      {c.address && <span className="text-muted-foreground"> · {c.address}</span>}
                    </div>
                    {c.lat === null && (
                      <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPinOff className="size-3" />
                        {t("clients.noLocation")}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{openRequests(c._count.requests)}</TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <Link href={`/clients/${c.id}/edit`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                        <Pencil />
                        {t("common.edit")}
                      </Link>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        }
        cards={clients.map((c) => (
          <ListCard key={c.id}>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{c.companyName}</div>
                <div className="truncate text-xs text-muted-foreground">{c.contactName}</div>
              </div>
              {openRequests(c._count.requests)}
              {canEdit && (
                <Link href={`/clients/${c.id}/edit`} className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label={t("common.edit")}>
                  <Pencil />
                </Link>
              )}
            </div>
            <div className="grid gap-1.5 text-sm">
              {c.phone && (
                <span className="inline-flex items-center gap-2">
                  <Phone className="size-3.5 text-muted-foreground" />
                  {phoneLink(c.phone)}
                </span>
              )}
              {(c.city || c.address) && (
                <span className="inline-flex min-w-0 items-center gap-2 text-muted-foreground">
                  {c.lat === null ? <MapPinOff className="size-3.5 shrink-0" /> : <MapPin className="size-3.5 shrink-0" />}
                  <span className="truncate">{[c.city, c.address].filter(Boolean).join(" · ")}</span>
                </span>
              )}
            </div>
          </ListCard>
        ))}
      />
    </div>
  );
}
