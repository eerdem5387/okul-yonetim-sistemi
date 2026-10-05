/**
 * Proje Yönetimi (Lise) A+B birleştir → Salı etütleri
 * Kullanım: npx tsx scripts/merge-proje-yonetimi-groups.ts
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const groups = await prisma.clubGroup.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: "Proje Yönetimi", mode: "insensitive" } },
        { club: { name: { contains: "Proje Yönetimi", mode: "insensitive" } } },
      ],
    },
    include: {
      club: { select: { id: true, name: true, instructorId: true } },
      students: { select: { studentId: true } },
      schedules: {
        where: { isActive: true },
        select: {
          id: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          room: true,
        },
      },
    },
    orderBy: { name: "asc" },
  })

  console.log(
    "Found groups:",
    groups.map((g) => ({
      id: g.id,
      name: g.name,
      club: g.club.name,
      students: g.students.length,
      schedules: g.schedules,
    }))
  )

  const a = groups.find((g) => /[-–]\s*A\s*$/i.test(g.name) || /\bA$/i.test(g.name.trim()))
  const b = groups.find((g) => /[-–]\s*B\s*$/i.test(g.name) || /\bB$/i.test(g.name.trim()))

  if (!a || !b) {
    // Fallback: exact names from screenshot
    const byExact = groups.filter((g) =>
      /Proje Yönetimi \(Lise\)\s*[-–]\s*[AB]/i.test(g.name)
    )
    console.log("Exact A/B candidates:", byExact.map((g) => g.name))
    throw new Error("A ve B grupları bulunamadı")
  }

  if (a.clubId !== b.clubId) {
    throw new Error("A ve B farklı kulüplere ait")
  }

  console.log("Merging B → A:", { a: a.name, b: b.name })

  const targetName = a.name.replace(/\s*[-–]\s*[AB]\s*$/i, "").trim() || "Proje Yönetimi (Lise)"

  await prisma.$transaction(async (tx) => {
    // B öğrencilerini A'ya taşı
    for (const m of b.students) {
      await tx.clubGroupStudent.upsert({
        where: {
          clubGroupId_studentId: { clubGroupId: a.id, studentId: m.studentId },
        },
        create: { clubGroupId: a.id, studentId: m.studentId },
        update: {},
      })
    }
    await tx.clubGroupStudent.deleteMany({ where: { clubGroupId: b.id } })

    // A'nın mevcut (Pazartesi) programlarını sil
    await tx.clubSchedule.deleteMany({ where: { clubGroupId: a.id } })

    // B'nin Salı programlarını A'ya taşı (çakışma olursa sil+yeniden oluştur)
    for (const sch of b.schedules) {
      const existing = await tx.clubSchedule.findFirst({
        where: {
          clubId: a.clubId,
          dayOfWeek: sch.dayOfWeek,
          startTime: sch.startTime,
          endTime: sch.endTime,
        },
      })
      if (existing) {
        await tx.clubSchedule.update({
          where: { id: existing.id },
          data: {
            clubGroupId: a.id,
            isActive: true,
            room: sch.room,
          },
        })
        if (existing.id !== sch.id) {
          await tx.clubSchedule.delete({ where: { id: sch.id } }).catch(() => null)
        }
      } else {
        await tx.clubSchedule.update({
          where: { id: sch.id },
          data: { clubGroupId: a.id },
        })
      }
    }

    // B'de kalan programları temizle
    await tx.clubSchedule.deleteMany({ where: { clubGroupId: b.id } })

    // İsim çakışması: soft-deleted aynı isim varsa arşivle
    const inactiveClash = await tx.clubGroup.findFirst({
      where: {
        clubId: a.clubId,
        name: targetName,
        isActive: false,
        id: { not: a.id },
      },
      select: { id: true },
    })
    if (inactiveClash) {
      await tx.clubGroup.update({
        where: { id: inactiveClash.id },
        data: { name: `${targetName}__archived_${inactiveClash.id.slice(-6)}` },
      })
    }

    // Aktif aynı isim (A/B dışında) varsa engelleme
    const activeClash = await tx.clubGroup.findFirst({
      where: {
        clubId: a.clubId,
        name: targetName,
        isActive: true,
        id: { notIn: [a.id, b.id] },
      },
      select: { id: true },
    })
    if (activeClash) {
      throw new Error(`Hedef isim zaten var: ${targetName}`)
    }

    await tx.clubGroup.update({
      where: { id: a.id },
      data: { name: targetName },
    })

    // B soft-delete + unique isim serbest
    await tx.clubGroup.update({
      where: { id: b.id },
      data: {
        isActive: false,
        name: `${b.name}__merged_${Date.now()}`,
      },
    })
  })

  // Salı programı yoksa oluştur
  const after = await prisma.clubGroup.findUnique({
    where: { id: a.id },
    include: {
      students: true,
      schedules: { where: { isActive: true } },
    },
  })

  const tuesday = (after?.schedules ?? []).filter((s) => s.dayOfWeek === 2)
  if (tuesday.length === 0) {
    // Varsayılan etütler
    const slots = [
      { startTime: "16:10", endTime: "16:40" },
      { startTime: "16:50", endTime: "17:20" },
    ]
    for (const slot of slots) {
      await prisma.clubSchedule.create({
        data: {
          clubId: a.clubId,
          clubGroupId: a.id,
          dayOfWeek: 2,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isActive: true,
        },
      })
    }
    console.log("Created Tuesday etüt slots")
  }

  const final = await prisma.clubGroup.findUnique({
    where: { id: a.id },
    include: {
      students: { include: { student: { select: { firstName: true, lastName: true } } } },
      schedules: { where: { isActive: true } },
    },
  })

  console.log("DONE:", {
    id: final?.id,
    name: final?.name,
    students: final?.students.length,
    schedules: final?.schedules,
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
