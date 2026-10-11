import type { NextConfig } from "next";
const nextConfig: NextConfig = { distDir: process.env.NEXT_OUTPUT_DIR || ".next" };
export default nextConfig;
