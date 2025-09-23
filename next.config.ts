import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  staticPageGenerationTimeout: 1000,
  experimental: {
    // Other experimental options can go here
  },
  // Disable caching for development
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

export default nextConfig;
