import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { CityMapPanel } from "./city-map-panel";

export default async function MapPage() {
  // Employees do not see the city map (CLAUDE.md, roles).
  const user = await requireUser(["ADMIN", "MANAGER"]);
  const t = await getTranslations("map");

  const [settings, clients] = await Promise.all([
    prisma.officeSettings.findUnique({ where: { id: 1 } }),
    prisma.client.findMany({ where: { lat: { not: null }, lng: { not: null } }, orderBy: { companyName: "asc" } }),
  ]);

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <CityMapPanel
        isAdmin={user.role === "ADMIN"}
        office={{
          id: "office",
          label: settings?.officeName ?? "Office",
          lat: settings?.officeLat ?? 37.4419,
          lng: settings?.officeLng ?? -122.143,
        }}
        clients={clients.map((c) => ({ id: c.id, label: c.companyName, lat: c.lat!, lng: c.lng! }))}
      />
    </div>
  );
}
