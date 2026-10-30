import { formatInTimeZone } from "date-fns-tz";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page";
import { Card, CardContent } from "@/components/ui/card";
import { getOfficeSettings } from "@/lib/attendance";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getTrack, getTrackViews, recordTrackView } from "@/lib/track";
import { TrackPanel } from "./track-panel";

export default async function TrackPage({ params }: { params: Promise<{ employeeId: string }> }) {
  // Same rights as the city map; for employees the page simply does not exist.
  const user = await requireUser();
  if (user.role === "EMPLOYEE") notFound();

  const { employeeId } = await params;
  const track = await getTrack(employeeId);
  if (!track) notFound();
  await recordTrackView(user.id, employeeId);

  const t = await getTranslations();
  const [clock, settings, views] = await Promise.all([
    getOfficeSettings(),
    prisma.officeSettings.findUnique({ where: { id: 1 }, select: { officeLat: true, officeLng: true } }),
    user.role === "ADMIN" ? getTrackViews(employeeId) : null,
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
      {views && (
        <Card data-testid="track-views">
          <CardContent className="grid gap-3 pt-5 text-sm">
            <h2 className="font-medium">{t("track.viewsTitle")}</h2>
            <ul className="grid gap-1.5">
              {views.map((v) => (
                <li key={v.id} className="flex flex-wrap justify-between gap-2">
                  <span>{v.name}</span>
                  <span className="text-muted-foreground">{formatInTimeZone(v.at, clock.timezone, "yyyy-MM-dd HH:mm")}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
