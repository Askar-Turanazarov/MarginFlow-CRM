"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { Circle, CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { personIcon } from "./markers";
import { OSM_ATTRIBUTION, OSM_TILES } from "./osm";

type Props = {
  personId: string;
  initials: string;
  name: string;
  center: { lat: number; lng: number };
  path: [number, number][];
  last: { lat: number; lng: number; accuracy: number } | null;
  checkInLabel: string;
  follow: boolean;
  /** The viewer dragged the map: stop following so it does not jump back. */
  onManualMove: () => void;
};

function Camera({ path, last, follow, onManualMove }: Pick<Props, "path" | "last" | "follow" | "onManualMove">) {
  const map = useMap();
  const fitted = useRef(false);
  useMapEvents({ dragstart: onManualMove });

  useEffect(() => {
    if (!path.length) return;
    // First data: show the whole path, then only keep the person in view.
    if (!fitted.current) {
      fitted.current = true;
      map.fitBounds(path, { padding: [48, 48], maxZoom: 17 });
    } else if (follow && last) {
      map.panTo([last.lat, last.lng]);
    }
  }, [map, path, last, follow]);
  return null;
}

/** Path since check-in, the check-in point and the current position with its accuracy circle. */
export default function TrackMapInner({ personId, initials, name, center, path, last, checkInLabel, follow, onManualMove }: Props) {
  return (
    <MapContainer center={[center.lat, center.lng]} zoom={13} className="h-full w-full">
      <TileLayer url={OSM_TILES} attribution={OSM_ATTRIBUTION} />
      <Camera path={path} last={last} follow={follow} onManualMove={onManualMove} />
      {path.length > 1 && <Polyline positions={path} pathOptions={{ color: "var(--primary)", weight: 4, opacity: 0.85 }} />}
      {path[0] && (
        <CircleMarker center={path[0]} radius={6} pathOptions={{ color: "var(--primary)", fillColor: "var(--card)", fillOpacity: 1, weight: 3 }}>
          <Tooltip direction="top">{checkInLabel}</Tooltip>
        </CircleMarker>
      )}
      {last && (
        <>
          {last.accuracy > 0 && (
            <Circle center={[last.lat, last.lng]} radius={last.accuracy} pathOptions={{ color: "var(--primary)", fillColor: "var(--primary)", fillOpacity: 0.12, weight: 1 }} />
          )}
          <Marker position={[last.lat, last.lng]} icon={personIcon(personId, initials)} zIndexOffset={1000}>
            <Tooltip direction="top">{name}</Tooltip>
          </Marker>
        </>
      )}
    </MapContainer>
  );
}
