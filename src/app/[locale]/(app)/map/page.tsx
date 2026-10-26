import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page";
import { getOfficeSettings } from "@/lib/attendance";
import { groupCities } from "@/lib/cities";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { CityMapPanel, type ClientPlace } from "./city-map-panel";

export default async function MapPage() {
  // Employees do not see the city map (CLAUDE.md, roles).
  const user = await requireUser(["ADMIN", "MANAGER"]);
  const t = await getTranslations("map");

  const [settings, clock, clients] = await Promise.all([
    prisma.officeSettings.findUnique({ where: { id: 1 } }),
    getOfficeSettings(),
    prisma.client.findMany({
      where: { lat: { not: null }, lng: { not: null } },
      include: {
        requests: {
          where: { status: { not: "DONE" } },
          include: { assignee: true },
          orderBy: { dueDate: "asc" },
        },
      },
      orderBy: { companyName: "asc" },
    }),
  ]);

  const office = {
    id: "office",
    label: settings?.officeName ?? "Office",
    lat: settings?.officeLat ?? 37.4419,
    lng: settings?.officeLng ?? -122.143,
  };
  const places: ClientPlace[] = clients.map((c) => ({
    id: c.id,
    label: c.companyName,
    city: c.city,
    lat: c.lat!,
    lng: c.lng!,
    requests: c.requests.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      assignee: r.assignee ? `${r.assignee.firstName} ${r.assignee.lastName}` : null,
    })),
  }));

  return (
    <div className="grid gap-5">
      <PageHeader title={t("title")} />
      <CityMapPanel
        isAdmin={user.role === "ADMIN"}
        office={office}
        clients={places}
        cities={groupCities(office, places)}
        timezone={clock.timezone}
      />
    </div>
  );
}
