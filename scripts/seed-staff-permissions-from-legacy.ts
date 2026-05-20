/**
 * Öğretmen hasGeziAccess / hasIbAccess bayraklarını StaffPermission satırlarına aktarır.
 * Çalıştırma: npx tsx scripts/seed-staff-permissions-from-legacy.ts
 */
import { PrismaClient } from "@prisma/client"
import { legacyFlagsToPermissionKeys, parsePermissionKey } from "../src/lib/permissions/constants"

const prisma = new PrismaClient()

async function main() {
  const teachers = await prisma.staff.findMany({
    where: {
      department: "OGRETMEN",
      OR: [{ hasGeziAccess: true }, { hasIbAccess: true }],
    },
    select: { id: true, firstName: true, lastName: true, hasGeziAccess: true, hasIbAccess: true },
  })

  let created = 0
  for (const staff of teachers) {
    const keys = legacyFlagsToPermissionKeys(staff.hasGeziAccess, staff.hasIbAccess)
    if (keys.length === 0) continue

    await prisma.staffPermission.deleteMany({
      where: {
        staffId: staff.id,
        module: { in: ["gezi", "activity_events"] },
      },
    })

    for (const key of keys) {
      const parsed = parsePermissionKey(key)
      if (!parsed) continue
      await prisma.staffPermission.upsert({
        where: {
          staffId_module_action: {
            staffId: staff.id,
            module: parsed.module,
            action: parsed.action,
          },
        },
        create: {
          staffId: staff.id,
          module: parsed.module,
          action: parsed.action,
          granted: true,
        },
        update: { granted: true },
      })
      created++
    }
    console.log(`✓ ${staff.firstName} ${staff.lastName}: ${keys.length} izin`)
  }

  console.log(`\nTamamlandı. ${teachers.length} öğretmen, ${created} izin satırı.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
