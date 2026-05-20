/**
 * Departman bazlı personel için StaffPermission yedeği (bir kez).
 * Yalnızca henüz hiç StaffPermission satırı olmayan personelde çalışır.
 * "permissions" modülü hariç tüm modül aksiyonlarını yazar (süper yönetici dışı).
 *
 * npx tsx scripts/seed-staff-permissions-backfill-depts.ts
 */
import { PrismaClient, StaffDepartment } from "@prisma/client"
import {
  ADMIN_ONLY_PERMISSION_MODULE_ID,
  PERMISSION_MODULES,
  permissionKey,
} from "../src/lib/permissions/constants"

const prisma = new PrismaClient()

const TARGET_DEPTS: StaffDepartment[] = [
  "MUDUR",
  "MUDUR_YARDIMCISI",
  "OGRENCI_ISLERI",
  "REHBERLIK",
  "BAS_REHBERLIK",
]

async function main() {
  const keys = PERMISSION_MODULES.filter((m) => m.id !== ADMIN_ONLY_PERMISSION_MODULE_ID).flatMap((m) =>
    m.actions.map((a) => permissionKey(m.id, a))
  )

  const staff = await prisma.staff.findMany({
    where: {
      isActive: true,
      department: { in: TARGET_DEPTS },
    },
    select: { id: true, firstName: true, lastName: true, department: true },
  })

  let updated = 0
  for (const s of staff) {
    const n = await prisma.staffPermission.count({ where: { staffId: s.id } })
    if (n > 0) continue

    const rows = keys.map((k) => {
      const dot = k.indexOf(".")
      return {
        staffId: s.id,
        module: k.slice(0, dot),
        action: k.slice(dot + 1),
        granted: true,
      }
    })
    await prisma.staffPermission.createMany({ data: rows })
    console.log(`✓ ${s.firstName} ${s.lastName} (${s.department}) — ${rows.length} izin`)
    updated++
  }

  console.log(`\nBitti. ${updated} personel güncellendi, ${staff.length - updated} atlandı (zaten izinli).`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
