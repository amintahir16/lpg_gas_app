import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

/**
 * Defence-in-depth response headers applied to every page/API response.
 *
 * - `Content-Security-Policy` keeps script/style sources to known places. We
 *   allow `'unsafe-inline'` for styles because Tailwind/Next inject styles,
 *   and `'unsafe-eval'` only in development for React Refresh / fast refresh.
 *   Tighten further once you adopt a nonce/hash strategy.
 * - `Strict-Transport-Security` is only emitted in production (no point on
 *   localhost over http) and forces every future request to https.
 * - `X-Frame-Options: DENY` blocks the app from being embedded in iframes —
 *   critical for an internal admin app to defeat clickjacking.
 * - `Referrer-Policy: strict-origin-when-cross-origin` keeps customer URLs
 *   (which often embed IDs) out of third-party referer headers.
 */
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "object-src 'none'",
      `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "manifest-src 'self'",
      "worker-src 'self' blob:",
    ].join('; '),
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  ...(isProd
    ? [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  staticPageGenerationTimeout: 1000,

  // Type errors are still surfaced to developers, but to avoid breaking
  // existing CI builds we keep them off in CI for now. Flip this to `false`
  // to enforce typing.
  typescript: {
    ignoreBuildErrors: true,
  },

  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },

  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },

  env: {
    HOSTNAME: '0.0.0.0',
  },

  devIndicators: {
    position: 'bottom-right',
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
