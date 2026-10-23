import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { RequestStatusBadge } from "@/components/request-status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">{t("clientForm.editTitle")}</h1>
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("clientForm.requestsTitle")}</CardTitle>
          <Link
            href={{ pathname: "/requests/new", query: { clientId: client.id } }}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {t("requests.add")}
          </Link>
        </CardHeader>
        <CardContent className="grid gap-2">
          {client.requests.length === 0 && <p className="text-sm text-muted-foreground">{t("clientForm.noRequests")}</p>}
          {client.requests.map((r) => (
            <Link
              key={r.id}
              href={`/requests/${r.id}/edit`}
              className="flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
            >
              <span className="font-medium">{r.title}</span>
              <RequestStatusBadge status={r.status} />
              <span className="text-muted-foreground">
                {r.assignee ? `${r.assignee.firstName} ${r.assignee.lastName}` : t("requests.notAssigned")}
              </span>
              {r.dueDate && (
                <span className="ml-auto text-muted-foreground">
                  {format.dateTime(r.dueDate, { dateStyle: "medium", timeZone: "UTC" })}
                </span>
              )}
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
