import { createHash, timingSafeEqual } from "node:crypto";

const MIN_SECRET_LENGTH = 16;

/** Checks "Authorization: Bearer <secret>". An empty, placeholder or short secret means the feature is off. */
export function bearerMatches(header: string | null, expected: string | undefined): boolean {
  if (!expected || expected === "change-me" || expected.length < MIN_SECRET_LENGTH) return false;
  const given = header?.match(/^Bearer (.+)$/)?.[1];
  if (!given) return false;
  // Compare hashes: equal length for timingSafeEqual and no early exit on the first different character.
  const hash = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(hash(given), hash(expected));
}
