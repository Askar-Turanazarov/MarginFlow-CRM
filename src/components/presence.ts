"use client";

import { useQuery } from "@tanstack/react-query";
import type { CityPerson, OfficePerson } from "@/lib/presence";
import type { TrackData, TrackedPerson } from "@/lib/track";

// Positions change every 3 seconds (simulator / sensors), so the screens ask for them at the same pace.
export const PRESENCE_POLL_MS = 3_000;

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

export function useOfficePresence() {
  return useQuery({
    queryKey: ["presence", "office"],
    queryFn: () => getJson<{ simulation: boolean; office: OfficePerson[] }>("/api/presence"),
    refetchInterval: PRESENCE_POLL_MS,
  });
}

export function useCityPresence() {
  return useQuery({
    queryKey: ["presence", "city"],
    queryFn: () => getJson<{ simulation: boolean; people: CityPerson[]; tracked: TrackedPerson[] }>("/api/presence/map"),
    refetchInterval: PRESENCE_POLL_MS,
  });
}

export function useTrack(employeeId: string, initialData: TrackData) {
  return useQuery({
    queryKey: ["track", employeeId],
    queryFn: () => getJson<TrackData>(`/api/track/${employeeId}`),
    refetchInterval: PRESENCE_POLL_MS,
    initialData,
  });
}
