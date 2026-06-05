import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // App Router only — no Pages Router
  turbopack: {}, // silence webpack/turbopack conflict warning
};

export default nextConfig;
