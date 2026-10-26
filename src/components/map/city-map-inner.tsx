"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import { OSM_ATTRIBUTION, OSM_TILES } from "./osm";

export type CityMapPerson = { id: string; initials: string; lat: number; lng: number; popup: React.ReactNode };
export type CityMapPlace = { id: string; label: string; lat: number; lng: number; popup?: React.ReactNode };
export type MapBounds = [[number, number], [number, number]];

type Props = {
  office: CityMapPlace;
  /** Clients with open requests (blue) and other clients (grey). */
  requests: CityMapPlace[];
  clients?: CityMapPlace[];
  people: CityMapPerson[];
  /** Area to show; changes when another city is chosen. */
  bounds?: MapBounds;
};

/** Moves the map to the chosen city. A city with one point gets a sensible zoom instead of the maximum. */
function FitBounds({ bounds }: { bounds?: MapBounds }) {
  const map = useMap();
  const key = JSON.stringify(bounds);
  useEffect(() => {
    if (!bounds) return;
    map.flyToBounds(bounds, { padding: [48, 48], maxZoom: 12, duration: 0.8 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when the area itself changes
  }, [key, map]);
  return null;
}

/** Office, requests and employees outside the office. Markers move when new positions arrive. */
export default function CityMapInner({ office, requests, clients = [], people, bounds }: Props) {
  return (
    <MapContainer center={[office.lat, office.lng]} zoom={11} scrollWheelZoom={false} className="h-full w-full">
      <TileLayer url={OSM_TILES} attribution={OSM_ATTRIBUTION} />
      <FitBounds bounds={bounds} />
      {clients.map((c) => (
        <CircleMarker
          key={c.id}
          center={[c.lat, c.lng]}
          radius={5}
          pathOptions={{ color: "#94a3b8", fillColor: "#e2e8f0", fillOpacity: 0.9, weight: 2 }}
        >
          <Tooltip>{c.label}</Tooltip>
        </CircleMarker>
      ))}
      {requests.map((r) => (
        <CircleMarker
          key={r.id}
          center={[r.lat, r.lng]}
          radius={8}
          pathOptions={{ color: "#1d4ed8", fillColor: "#3b82f6", fillOpacity: 0.85, weight: 2 }}
        >
          <Tooltip direction="top" offset={[0, -6]}>
            {r.label}
          </Tooltip>
          {r.popup && <Popup>{r.popup}</Popup>}
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
