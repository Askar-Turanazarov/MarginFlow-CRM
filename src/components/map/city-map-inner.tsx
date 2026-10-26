"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import { clientIcon, officeIcon, personIcon } from "./markers";
import { OSM_ATTRIBUTION, OSM_TILES } from "./osm";

export type CityMapPerson = { id: string; name: string; initials: string; lat: number; lng: number; popup: React.ReactNode };
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

/** Office, requests and employees outside the office. People glide to new positions as they arrive. */
export default function CityMapInner({ office, requests, clients = [], people, bounds }: Props) {
  return (
    <MapContainer center={[office.lat, office.lng]} zoom={11} scrollWheelZoom={false} className="h-full w-full">
      <TileLayer url={OSM_TILES} attribution={OSM_ATTRIBUTION} />
      <FitBounds bounds={bounds} />
      {clients.map((c) => (
        <Marker key={c.id} position={[c.lat, c.lng]} icon={clientIcon(false)}>
          <Tooltip direction="top">{c.label}</Tooltip>
        </Marker>
      ))}
      {requests.map((r) => (
        <Marker key={r.id} position={[r.lat, r.lng]} icon={clientIcon(true)}>
          <Tooltip direction="top">{r.label}</Tooltip>
          {r.popup && <Popup>{r.popup}</Popup>}
        </Marker>
      ))}
      <Marker position={[office.lat, office.lng]} icon={officeIcon()} zIndexOffset={500}>
        <Tooltip permanent direction="top">
          {office.label}
        </Tooltip>
      </Marker>
      {people.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={personIcon(p.id, p.initials)} zIndexOffset={1000}>
          <Tooltip direction="top">{p.name}</Tooltip>
          <Popup>{p.popup}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
