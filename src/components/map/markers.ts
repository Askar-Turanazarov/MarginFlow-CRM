import { divIcon, type DivIcon } from "leaflet";
import { hueOf } from "@/lib/avatar";

// HTML markers styled in globals.css (.map-*): theme tokens, avatars instead of plain circles.
// Icons are cached, so a moving person keeps the same DOM node and glides instead of re-rendering.
const cache = new Map<string, DivIcon>();

function cached(key: string, make: () => DivIcon) {
  let icon = cache.get(key);
  if (!icon) cache.set(key, (icon = make()));
  return icon;
}

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Person outside the office: their avatar in a soft amber ring. */
export const personIcon = (id: string, initials: string) =>
  cached(`p:${id}:${initials}`, () =>
    divIcon({
      className: "map-person",
      html: `<span style="--hue:${hueOf(id)}">${escape(initials)}</span>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -18],
      tooltipAnchor: [0, -18],
    }),
  );

/** Office: a raised emerald pin with a building glyph. */
export const officeIcon = () =>
  cached("office", () =>
    divIcon({
      className: "map-office",
      html: `<span><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4M10 10h4M10 14h4M10 18h4"/></svg></span>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      tooltipAnchor: [0, -20],
    }),
  );

/** Client: blue dot with open requests, small grey dot without. */
export const clientIcon = (withRequests: boolean) =>
  cached(`c:${withRequests}`, () =>
    divIcon({
      className: withRequests ? "map-dot map-dot-request" : "map-dot map-dot-client",
      iconSize: withRequests ? [16, 16] : [11, 11],
      popupAnchor: [0, -8],
      tooltipAnchor: [0, -8],
    }),
  );

/** The point being chosen in a form. */
export const pickIcon = () =>
  cached("pick", () =>
    divIcon({
      className: "map-pick",
      html: "<span></span>",
      iconSize: [28, 36],
      iconAnchor: [14, 34],
    }),
  );
