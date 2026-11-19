/**
 * Varsayılan: prisma migrate deploy + generate + next build.
 * Önizleme/CI ortamında (DB yok) SKIP_PRISMA_MIGRATE_ON_BUILD=1 verin; canlı yayında (VERCEL_ENV=production) bu ayar yok sayılır.
 */
const { execSync } = require("node:child_process")

function run(cmd) {
  execSync(cmd, { stdio: "inherit", env: process.env })
}

// Canlı (production) yayında migration her zaman uygulanır; aksi halde site eksik tabloyla açılabilir.
const isProductionDeploy = process.env.VERCEL_ENV === "production"
const skipMigrate =
  !isProductionDeploy &&
  (process.env.SKIP_PRISMA_MIGRATE_ON_BUILD === "1" ||
    process.env.SKIP_PRISMA_MIGRATE_ON_BUILD === "true")

if (skipMigrate) {
  console.warn(
    "[build] SKIP_PRISMA_MIGRATE_ON_BUILD etkin; prisma migrate deploy atlandı."
  )
} else {
  if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
    process.env.DIRECT_URL = process.env.DATABASE_URL
  }
  run("npx prisma migrate deploy")
}

run("npx prisma generate")
run("npx next build --turbopack")
