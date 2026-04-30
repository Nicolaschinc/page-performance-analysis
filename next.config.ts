import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['chrome-launcher', 'lighthouse'],
  devIndicators: false,
};

export default nextConfig;
