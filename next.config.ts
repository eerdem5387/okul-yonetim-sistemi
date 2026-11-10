import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Puppeteer + Sparticuz Chromium must stay external (Vercel serverless PDF)
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
  async rewrites() {
    return [
      // Eski mobil build'ler: /api/notifications/[id] "push-token"i yutmasın
      {
        source: "/api/notifications/push-token",
        destination: "/api/mobile/push-token",
      },
    ]
  },
};

export default nextConfig;
