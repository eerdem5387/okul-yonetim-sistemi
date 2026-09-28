/**
 * Mevcut kulüp başvurularından (ClubSelection) her kulüp için bir grup oluşturur.
 * Idempotent: aynı (clubId, name) varsa öğrencileri senkronlar.
 *
 * Kullanım: npx tsx scripts/seed-club-groups-from-selections.ts
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const clubs = await prisma.club.findMany({
    orderBy: { name: "asc" },
    include: {
      selections: { select: { studentId: true } },
    },
  })

  let created = 0
  let updated = 0
  let skippedEmpty = 0
  let totalStudents = 0

  for (const club of clubs) {
    if (club.selections.length === 0) {
      skippedEmpty++
      continue
    }

    const groupName = club.name
    const studentIds = [...new Set(club.selections.map((s) => s.studentId))]

    const existing = await prisma.clubGroup.findFirst({
      where: { clubId: club.id, name: groupName },
    })

    if (!existing) {
      await prisma.clubGroup.create({
        data: {
          clubId: club.id,
          name: groupName,
          notes: "Başvurulardan otomatik oluşturuldu",
          students: {
            create: studentIds.map((studentId) => ({ studentId })),
          },
        },
      })
      created++
      totalStudents += studentIds.length
      console.log(`+ ${club.name}: ${studentIds.length} öğrenci`)
      continue
    }

    await prisma.clubGroup.update({
      where: { id: existing.id },
      data: { isActive: true },
    })
    await prisma.clubGroupStudent.deleteMany({ where: { clubGroupId: existing.id } })
    await prisma.clubGroupStudent.createMany({
      data: studentIds.map((studentId) => ({
        clubGroupId: existing.id,
        studentId,
      })),
    })
    updated++
    totalStudents += studentIds.length
    console.log(`~ ${club.name}: ${studentIds.length} öğrenci (güncellendi)`)
  }

  // Mevcut ClubSchedule kayıtlarını, kulübün varsayılan grubuna bağla (varsa)
  const schedulesWithoutGroup = await prisma.clubSchedule.findMany({
    where: { clubGroupId: null, isActive: true },
    select: { id: true, clubId: true },
  })
  let linked = 0
  for (const row of schedulesWithoutGroup) {
    const club = clubs.find((c) => c.id === row.clubId)
    if (!club) continue
    const group = await prisma.clubGroup.findFirst({
      where: { clubId: row.clubId, name: club.name, isActive: true },
      select: { id: true },
    })
    if (!group) continue
    await prisma.clubSchedule.update({
      where: { id: row.id },
      data: { clubGroupId: group.id },
    })
    linked++
  }

  console.log(
    JSON.stringify({
      clubCount: clubs.length,
      created,
      updated,
      skippedEmpty,
      totalStudents,
      schedulesLinked: linked,
    })
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
