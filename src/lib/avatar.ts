// Every person keeps the same personal colour everywhere (plan, feed, lists): a hue picked by id.
const HUES = [152, 205, 262, 18, 70, 182, 318, 236, 112, 42];

export function hueOf(id: string) {
  return HUES[[...id].reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) >>> 0, 7) % HUES.length];
}

export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
