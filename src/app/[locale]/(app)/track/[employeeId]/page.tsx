import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page";
import { getOfficeSettings } from "@/lib/attendance";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getTrack } from "@/lib/track";
import { TrackPanel } from "./track-panel";

export default async function TrackPage({ params }: { params: Promise<{ employeeId: string }> }) {
  // Same rights as the city map; for employees the page simply does not exist.
  const user = await requireUser();
  if (user.role === "EMPLOYEE") notFound();

  const { employeeId } = await params;
  const track = await getTrack(employeeId);
  if (!track) notFound();

  const t = await getTranslations();
  const [clock, settings] = await Promise.all([
    getOfficeSettings(),
    prisma.officeSettings.findUnique({ where: { id: 1 }, select: { officeLat: true, officeLng: true } }),
  ]);

  return (
    <div className="grid gap-5">
      <PageHeader title={t("track.title", { name: track.name })} description={track.position} back={{ href: "/map", label: t("map.title") }} />
      <TrackPanel
        employeeId={employeeId}
        initial={track}
        timezone={clock.timezone}
        center={{ lat: settings?.officeLat ?? 37.4419, lng: settings?.officeLng ?? -122.143 }}
      />
    </div>
  );
}
