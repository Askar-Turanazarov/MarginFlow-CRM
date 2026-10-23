"use client";

import dynamic from "next/dynamic";

// Leaflet needs `window`, so maps are rendered only in the browser.
const placeholder = () => <div className="h-full min-h-72 w-full animate-pulse rounded-lg bg-muted" />;

export const ClientsMap = dynamic(() => import("./clients-map-inner"), { ssr: false, loading: placeholder });
export const LocationPicker = dynamic(() => import("./location-picker-inner"), { ssr: false, loading: placeholder });
export type { ClientPoint } from "./clients-map-inner";
