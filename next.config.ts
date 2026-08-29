import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-hosting (bun standalone) needs the standalone bundle; Vercel builds and
  // serves its own way, so leave `output` unset there (VERCEL=1 on Vercel).
  output: process.env.VERCEL ? undefined : "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
