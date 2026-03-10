import type { NextConfig } from "next";

const replitDomain = process.env.REPLIT_DEV_DOMAIN || "";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    `https://${replitDomain}`,
    "*.replit.dev",
    "*.repl.co",
  ].filter(Boolean),
};

export default nextConfig;
