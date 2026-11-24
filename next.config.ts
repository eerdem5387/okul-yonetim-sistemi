import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Puppeteer + Sparticuz Chromium must stay external (Vercel serverless PDF)
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
  // Optik sınav: CSV ve hazır form şablonları çalışma anında dosyadan okunuyor; pakete dahil edilmeli
  outputFileTracingIncludes: {
    "/api/exams/[id]/import": ["./packages/exam-import-contract/*.csv"],
    "/api/exam-scan-templates": ["./packages/exam-import-contract/templates/*.json"],
  },
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
