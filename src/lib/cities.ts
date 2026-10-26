// Groups map points into "cities": points closer than CITY_RADIUS_KM to a city's first point belong to it.
// Palo Alto, Mountain View and San Jose → one city; Los Angeles and Tashkent → their own.

export const CITY_RADIUS_KM = 120;

export type GeoPoint = { lat: number; lng: number };
export type City = { id: string; label: string; center: GeoPoint; bounds: [[number, number], [number, number]] };

export function distanceKm(a: GeoPoint, b: GeoPoint) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 12_742 * Math.asin(Math.sqrt(h));
}

/** "Palo Alto, CA" → "Palo Alto". */
const shortCity = (city: string | null | undefined) => city?.split(",")[0]?.trim() || null;

/** The office city comes first; a city is named after the most common client city in it. */
export function groupCities(office: GeoPoint & { label: string }, places: (GeoPoint & { city?: string | null })[]): City[] {
  const groups: { seed: GeoPoint; points: GeoPoint[]; names: string[] }[] = [{ seed: office, points: [office], names: [] }];
  for (const p of places) {
    const group = groups.find((g) => distanceKm(g.seed, p) <= CITY_RADIUS_KM);
    const name = shortCity(p.city);
    if (group) {
      group.points.push(p);
      if (name) group.names.push(name);
    } else {
      groups.push({ seed: p, points: [p], names: name ? [name] : [] });
    }
  }
  return groups.map((g, i) => {
    const counts = new Map<string, number>();
    for (const n of g.names) counts.set(n, (counts.get(n) ?? 0) + 1);
    // Office city: the client city nearest to the office (else the office name).
    const nearest = i === 0 ? places.filter((p) => shortCity(p.city)).sort((a, b) => distanceKm(office, a) - distanceKm(office, b))[0] : null;
    const label = (i === 0 ? shortCity(nearest?.city) : [...counts].sort((a, b) => b[1] - a[1])[0]?.[0]) ?? office.label;
    const lats = g.points.map((p) => p.lat);
    const lngs = g.points.map((p) => p.lng);
    return {
      id: `city-${i}`,
      label,
      center: { lat: (Math.min(...lats) + Math.max(...lats)) / 2, lng: (Math.min(...lngs) + Math.max(...lngs)) / 2 },
      bounds: [
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)],
      ],
    };
  });
}

/** City a point belongs to: the nearest city centre. */
export function cityOf(cities: City[], p: GeoPoint) {
  return cities.reduce((best, c) => (distanceKm(c.center, p) < distanceKm(best.center, p) ? c : best), cities[0]);
}
