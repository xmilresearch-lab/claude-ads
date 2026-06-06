import type { NextConfig } from "next";

// next-pwa v5 is CommonJS; require works in Next.js config compilation context
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require('next-pwa') as (opts: Record<string, unknown>) => (cfg: NextConfig) => NextConfig

const nextConfig: NextConfig = {
  turbopack: {},
  async headers() {
    const aiRouteHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
      { key: 'Pragma', value: 'no-cache' },
    ]
    return [
      { source: '/api/analyze', headers: aiRouteHeaders },
      { source: '/api/assistant', headers: aiRouteHeaders },
    ]
  },
}

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // Disable in dev — Turbopack doesn't fire webpack plugins anyway
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      // AI calls: never cache
      urlPattern: /^https?:\/\/.*\/api\/analyze/,
      handler: 'NetworkOnly',
    },
    {
      urlPattern: /^https?:\/\/.*\/api\/assistant/,
      handler: 'NetworkOnly',
    },
    {
      // History: network-first with short TTL
      urlPattern: /^https?:\/\/.*\/dashboard\/history/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'analysis-history',
        expiration: { maxEntries: 50, maxAgeSeconds: 300 },
      },
    },
    {
      // Other dashboard pages: stale-while-revalidate
      urlPattern: /^https?:\/\/.*\/dashboard/,
      handler: 'StaleWhileRevalidate',
    },
    {
      // Static assets: cache-first
      urlPattern: /\.(js|css|png|jpg|jpeg|svg|ico|woff2?)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-assets',
        expiration: { maxEntries: 100, maxAgeSeconds: 86400 * 30 },
      },
    },
  ],
})(nextConfig)
