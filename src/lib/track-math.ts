// Pure maths for phone tracking: no database here, so it is easy to test.

export type TrackPoint = { lat: number; lng: number; accuracy: number; at: number };

/** Moves shorter than this are GPS jitter, even when the phone claims better accuracy. */
const MIN_STEP_M = 5;
/** Speed is measured over the last half minute, so one jumpy point does not spike it. */
const SPEED_WINDOW_MS = 30_000;

/** Minimum time between two phone points: tracked people send every 10 s, others once a minute. A small margin allows for network delays. */
export function phoneMinIntervalMs(trackByPhone: boolean) {
  return trackByPhone ? 8_000 : 50_000;
}

/** Distance between two points in metres (haversine). */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

/** Length of the path. A move smaller than the point's accuracy is noise: a phone lying on a table must not "walk". */
export function trackDistanceMeters(points: TrackPoint[]) {
  let total = 0;
  let anchor = points[0];
  for (const p of points.slice(1)) {
    const d = distanceMeters(anchor, p);
    if (d < Math.max(MIN_STEP_M, p.accuracy)) continue;
    total += d;
    anchor = p;
  }
  return total;
}

/** Speed over the last half minute, km/h. null — not enough points to tell. */
export function currentSpeedKmh(points: TrackPoint[]) {
  const last = points.at(-1);
  if (!last) return null;
  const first = points.find((p) => p.at >= last.at - SPEED_WINDOW_MS)!;
  if (first.at === last.at) return null;
  const d = distanceMeters(first, last);
  if (d < Math.max(MIN_STEP_M, last.accuracy)) return 0;
  return (d / (last.at - first.at)) * 3600;
}
