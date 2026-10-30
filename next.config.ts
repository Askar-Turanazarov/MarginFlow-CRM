import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// The phone reaches the dev server through a Cloudflare tunnel (npm run tunnel). Anyone can get such an address, so never in production.
const TUNNEL_ORIGINS = process.env.NODE_ENV === "development" ? ["*.trycloudflare.com"] : [];

const nextConfig: NextConfig = {
  allowedDevOrigins: TUNNEL_ORIGINS,
  // Office plan images (up to 5 MB) are uploaded through a Server Action.
  experimental: { serverActions: { bodySizeLimit: "6mb", allowedOrigins: TUNNEL_ORIGINS } },
};

export default createNextIntlPlugin()(nextConfig);
