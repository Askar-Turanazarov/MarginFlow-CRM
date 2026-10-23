"use client";

import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap } from "leaflet";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CircleMarker, MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OSM_ATTRIBUTION, OSM_TILES } from "./osm";

type Point = { lat: number; lng: number };

function ClickToSet({ onPick }: { onPick: (p: Point) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;

/** Map with a single point; writes `lat` and `lng` hidden inputs for the surrounding form. */
export default function LocationPickerInner({ initial, query }: { initial: Point | null; query: string }) {
  const t = useTranslations("clientForm");
  const [point, setPoint] = useState<Point | null>(initial);
  const [map, setMap] = useState<LeafletMap | null>(null);
  const [search, setSearch] = useState(query);
  const [status, setStatus] = useState<"idle" | "searching" | "notFound">("idle");

  const pick = (p: Point) => setPoint({ lat: round(p.lat), lng: round(p.lng) });

  // Nominatim (OpenStreetMap geocoder): free, no key; called only on button press.
  async function find() {
    if (!search.trim()) return;
    setStatus("searching");
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(search)}`;
      const results: { lat: string; lon: string }[] = await fetch(url).then((r) => r.json());
      if (results.length === 0) return setStatus("notFound");
      const p = { lat: Number(results[0].lat), lng: Number(results[0].lon) };
      pick(p);
      map?.setView([p.lat, p.lng], 15);
      setStatus("idle");
    } catch {
      setStatus("notFound");
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              find();
            }
          }}
          placeholder={t("searchPlaceholder")}
        />
        <Button type="button" variant="outline" onClick={find} disabled={status === "searching"}>
          {status === "searching" ? t("searching") : t("search")}
        </Button>
      </div>
      {status === "notFound" && <p className="text-xs text-destructive">{t("notFound")}</p>}

      <div className="h-72 overflow-hidden rounded-lg border">
        <MapContainer
          ref={setMap}
          center={initial ? [initial.lat, initial.lng] : [37.44, -122.14]}
          zoom={initial ? 14 : 9}
          className="h-full w-full cursor-crosshair"
        >
          <TileLayer url={OSM_TILES} attribution={OSM_ATTRIBUTION} />
          <ClickToSet onPick={pick} />
          {point && (
            <CircleMarker
              center={[point.lat, point.lng]}
              radius={9}
              pathOptions={{ color: "#b91c1c", fillColor: "#ef4444", fillOpacity: 0.9, weight: 2 }}
            />
          )}
        </MapContainer>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>{point ? `${point.lat}, ${point.lng}` : t("locationHint")}</span>
        {point && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setPoint(null)}>
            {t("clearPoint")}
          </Button>
        )}
      </div>
      <input type="hidden" name="lat" value={point?.lat ?? ""} />
      <input type="hidden" name="lng" value={point?.lng ?? ""} />
    </div>
  );
}
