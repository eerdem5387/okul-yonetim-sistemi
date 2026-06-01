import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Puppeteer + Sparticuz Chromium must stay external (Vercel serverless PDF)
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
};

export default nextConfig;
