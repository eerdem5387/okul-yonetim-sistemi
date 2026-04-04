/**
 * Varsayılan: prisma migrate deploy + generate + next build.
 * Önizleme/CI ortamında (DB yok) Vercel’de SKIP_PRISMA_MIGRATE_ON_BUILD=1 verin.
 */
const { execSync } = require("node:child_process")

function run(cmd) {
  execSync(cmd, { stdio: "inherit", env: process.env })
}

const skipMigrate =
  process.env.SKIP_PRISMA_MIGRATE_ON_BUILD === "1" ||
  process.env.SKIP_PRISMA_MIGRATE_ON_BUILD === "true"

if (skipMigrate) {
  console.warn(
    "[build] SKIP_PRISMA_MIGRATE_ON_BUILD etkin; prisma migrate deploy atlandı."
  )
} else {
  run("npx prisma migrate deploy")
}

run("npx prisma generate")
run("npx next build --turbopack")
