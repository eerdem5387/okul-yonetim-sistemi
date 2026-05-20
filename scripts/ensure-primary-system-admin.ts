/**
 * Birincil sistem yöneticisini (PRIMARY_SYSTEM_ADMIN_STAFF_ID) SUPER_ADMIN yapar.
 *
 * Kullanım: npx tsx scripts/ensure-primary-system-admin.ts
 */

import { PrismaClient } from "@prisma/client"
import { PRIMARY_SYSTEM_ADMIN_STAFF_ID } from "../src/lib/permissions/system-admin"

const prisma = new PrismaClient()

async function main() {
  const existing = await prisma.staff.findUnique({
    where: { id: PRIMARY_SYSTEM_ADMIN_STAFF_ID },
  })

  if (!existing) {
    console.error(`❌ Personel bulunamadı: ${PRIMARY_SYSTEM_ADMIN_STAFF_ID}`)
    process.exit(1)
  }

  const updated = await prisma.staff.update({
    where: { id: PRIMARY_SYSTEM_ADMIN_STAFF_ID },
    data: {
      department: "SUPER_ADMIN",
      position: "Sistem Yöneticisi",
      isActive: true,
    },
  })

  console.log("✅ Birincil sistem yöneticisi güncellendi:")
  console.log(`   ${updated.firstName} ${updated.lastName} (${updated.id})`)
  console.log(`   department: ${updated.department}`)
  console.log("\n💡 Menü ve yetkilendirme için çıkış yapıp tekrar giriş yapın.")
}

main()
  .catch((e) => {
    console.error("❌ Hata:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
