import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// The phone reaches the dev server through a Cloudflare tunnel (npm run tunnel). Anyone can get such an address, so never in production.
const isDev = process.env.NODE_ENV === "development";
const TUNNEL_ORIGINS = isDev ? ["*.trycloudflare.com"] : [];

// Next.js adds inline scripts, so 'unsafe-inline' stays; external sources are limited to OpenStreetMap (tiles and address search).
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://tile.openstreetmap.org",
  `connect-src 'self' https://nominatim.openstreetmap.org${isDev ? " ws: wss:" : ""}`,
  "font-src 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=()" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  allowedDevOrigins: TUNNEL_ORIGINS,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  // Office plan images (up to 4 MB) are uploaded through a Server Action. Vercel refuses bodies over 4.5 MB.
  experimental: { serverActions: { bodySizeLimit: "4.5mb", allowedOrigins: TUNNEL_ORIGINS } },
};

export default createNextIntlPlugin()(nextConfig);
