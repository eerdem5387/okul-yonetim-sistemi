/**
 * activities tablosuna certificateData (JSONB) sütununu ekler.
 * Migration geçmişi karışık olduğunda tek seferlik çalıştırın: node scripts/add-certificate-data-column.js
 */
const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function main() {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "certificateData" JSONB;
    `)
    console.log("✓ certificateData sütunu eklendi veya zaten mevcut.")
  } catch (e) {
    console.error("Hata:", e.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
