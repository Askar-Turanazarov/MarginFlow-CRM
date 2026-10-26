"use client";

import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip } from "react-leaflet";
import { OSM_ATTRIBUTION, OSM_TILES } from "./osm";

export type CityMapPerson = { id: string; initials: string; lat: number; lng: number; popup: React.ReactNode };
export type CityMapPlace = { id: string; label: string; lat: number; lng: number };

type Props = { office: CityMapPlace; clients: CityMapPlace[]; people: CityMapPerson[] };

/** Office, clients and employees outside the office. Markers move when new positions arrive. */
export default function CityMapInner({ office, clients, people }: Props) {
  return (
    <MapContainer center={[office.lat, office.lng]} zoom={11} scrollWheelZoom={false} className="h-full w-full">
      <TileLayer url={OSM_TILES} attribution={OSM_ATTRIBUTION} />
      {clients.map((c) => (
        <CircleMarker
          key={c.id}
          center={[c.lat, c.lng]}
          radius={6}
          pathOptions={{ color: "#64748b", fillColor: "#cbd5e1", fillOpacity: 0.9, weight: 2 }}
        >
          <Tooltip>{c.label}</Tooltip>
        </CircleMarker>
      ))}
      <CircleMarker
        center={[office.lat, office.lng]}
        radius={11}
        pathOptions={{ color: "#6d28d9", fillColor: "#8b5cf6", fillOpacity: 0.9, weight: 3 }}
      >
        <Tooltip permanent direction="top" offset={[0, -10]}>
          {office.label}
        </Tooltip>
      </CircleMarker>
      {people.map((p) => (
        <CircleMarker
          key={p.id}
          center={[p.lat, p.lng]}
          radius={9}
          pathOptions={{ color: "#b45309", fillColor: "#f59e0b", fillOpacity: 0.95, weight: 2 }}
        >
          <Tooltip permanent direction="right" offset={[8, 0]}>
            {p.initials}
          </Tooltip>
          <Popup>{p.popup}</Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
