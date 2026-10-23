import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Office plan images (up to 5 MB) are uploaded through a Server Action.
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
};

export default createNextIntlPlugin()(nextConfig);
