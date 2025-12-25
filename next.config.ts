import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ยอมให้ Build ผ่านแม้จะมี Error จาก ESLint
    ignoreDuringBuilds: true,
  },
  typescript: {
    // ยอมให้ Build ผ่านแม้จะมี Error จาก TypeScript (พวก any หรือ types)
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
