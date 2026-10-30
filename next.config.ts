import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Office plan images (up to 5 MB) are uploaded through a Server Action.
  // The phone reaches the dev server through a Cloudflare tunnel (npm run tunnel).
  allowedDevOrigins: ["*.trycloudflare.com"],
  experimental: { serverActions: { bodySizeLimit: "6mb", allowedOrigins: ["*.trycloudflare.com"] } },
};

export default createNextIntlPlugin()(nextConfig);
