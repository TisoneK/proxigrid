import { dirname } from "path";
import { fileURLToPath } from "url";
import type { NextConfig } from "next";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Self-hosting (bun standalone) needs the standalone bundle; Vercel builds and
  // serves its own way, so leave `output` unset there (VERCEL=1 on Vercel).
  output: process.env.VERCEL ? undefined : "standalone",
  // Anchor Turbopack to the repo so a stray package-lock.json in a parent
  // directory (e.g. the user's home folder) can't redefine the workspace root.
  turbopack: {
    root: projectRoot,
  },
  reactStrictMode: false,
};

export default nextConfig;
