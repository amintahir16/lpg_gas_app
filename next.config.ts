import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  staticPageGenerationTimeout: 1000,
  // Disable ESLint during build for Railway
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Turbopack configuration (moved from experimental.turbo)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  // Development optimizations for Railway
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // Ensure proper hostname binding for Railway
  env: {
    HOSTNAME: '0.0.0.0',
  },
  // Development server configuration (updated for Next.js 15.5.2)
  devIndicators: {
    position: 'bottom-right',
  },
};

export default nextConfig;
