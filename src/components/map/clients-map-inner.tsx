"use client";

import "leaflet/dist/leaflet.css";
import { latLngBounds } from "leaflet";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { OSM_ATTRIBUTION, OSM_TILES } from "./osm";

export type ClientPoint = { id: string; companyName: string; city: string | null; lat: number; lng: number; href?: string };

export default function ClientsMapInner({ points }: { points: ClientPoint[] }) {
  const bounds = points.length > 0 ? latLngBounds(points.map((p) => [p.lat, p.lng])) : undefined;

  return (
    <MapContainer
      bounds={bounds}
      boundsOptions={{ padding: [30, 30], maxZoom: 12 }}
      center={bounds ? undefined : [37.44, -122.14]}
      zoom={bounds ? undefined : 9}
      scrollWheelZoom={false}
      className="h-full w-full"
    >
      <TileLayer url={OSM_TILES} attribution={OSM_ATTRIBUTION} />
      {points.map((p) => (
        <CircleMarker
          key={p.id}
          center={[p.lat, p.lng]}
          radius={8}
          pathOptions={{ color: "#1d4ed8", fillColor: "#3b82f6", fillOpacity: 0.85, weight: 2 }}
        >
          <Popup>
            {p.href ? (
              <a href={p.href} className="font-medium">
                {p.companyName}
              </a>
            ) : (
              <span className="font-medium">{p.companyName}</span>
            )}
            {p.city && <div>{p.city}</div>}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
