import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https:",
  `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL ?? "*"}`,
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "https", hostname: "**.cloudfront.net" },
    ],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: cspDirectives },
          ...(!isDev
            ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
            : []),
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: "/",
        destination: "/automations",
        permanent: false,
      },
    ];
  },

  compiler: {
    removeConsole: !isDev,
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  experimental: { turbo: {} } as any,
};

export default nextConfig;
