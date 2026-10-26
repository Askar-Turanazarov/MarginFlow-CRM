import { ChevronRight, ClipboardList, Plus } from "lucide-react";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { EmptyState, PageHeader } from "@/components/page";
import { RequestStatusBadge } from "@/components/request-status-badge";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ClientForm } from "../../client-form";

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(["ADMIN", "MANAGER"]);
  const { id } = await params;
  const t = await getTranslations();
  const format = await getFormatter();

  const client = await prisma.client.findUnique({
    where: { id },
    include: { requests: { include: { assignee: true }, orderBy: { createdAt: "desc" } } },
  });
  if (!client) notFound();

  return (
    <div className="grid gap-5">
      <PageHeader title={t("clientForm.editTitle")} description={client.companyName} back={{ href: "/clients", label: t("clients.title") }} />
      <ClientForm
        id={client.id}
        initial={{
          companyName: client.companyName,
          contactName: client.contactName,
          phone: client.phone ?? "",
          email: client.email ?? "",
          city: client.city ?? "",
          address: client.address ?? "",
          notes: client.notes ?? "",
          lat: client.lat,
          lng: client.lng,
        }}
      />

      <Reveal>
        <Card>
          <CardHeader>
            <CardTitle>{t("clientForm.requestsTitle")}</CardTitle>
            <CardAction>
              <Link
                href={{ pathname: "/requests/new", query: { clientId: client.id } }}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <Plus />
                {t("requests.add")}
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-1.5">
            {client.requests.length === 0 && <EmptyState icon={ClipboardList} text={t("clientForm.noRequests")} className="py-8" />}
            {client.requests.map((r) => (
              <Link
                key={r.id}
                href={`/requests/${r.id}/edit`}
                className="group/row flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl px-3 py-2.5 text-sm transition-colors duration-200 hover:bg-primary/[.05]"
              >
                <span className="min-w-0 flex-1 font-medium">{r.title}</span>
                <RequestStatusBadge status={r.status} />
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  {r.assignee && <Avatar id={r.assignee.id} name={`${r.assignee.firstName} ${r.assignee.lastName}`} size="xs" />}
                  {r.assignee ? `${r.assignee.firstName} ${r.assignee.lastName}` : t("requests.notAssigned")}
                </span>
                {r.dueDate && (
                  <span className="nums text-muted-foreground">{format.dateTime(r.dueDate, { dateStyle: "medium", timeZone: "UTC" })}</span>
                )}
                <ChevronRight className="size-4 text-muted-foreground transition-transform duration-300 [transition-timing-function:var(--ease-spring)] group-hover/row:translate-x-0.5" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}
