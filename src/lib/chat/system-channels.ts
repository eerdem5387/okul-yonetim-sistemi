import type { StaffDepartment } from "@prisma/client"
import { prisma } from "@/lib/prisma"

const CHANNEL_ADMIN_DEPARTMENTS: StaffDepartment[] = ["KURUCU", "MUDUR", "SUPER_ADMIN"]

let lastSyncAt = 0
const SYNC_INTERVAL_MS = 5 * 60 * 1000

/**
 * Okul kaydından beslenen kalıcı kanallar.
 * İdare, rehberlik ve ders programındaki sınıf öğretmenleri.
 * Branş zümreleri otomatik açılmaz; elle grup olarak oluşturulur.
 * Kurucu, müdür ve süper admin bu kanallarda yöneticidir; yazmayı kapatabilir.
 */
export async function syncSystemChannels(): Promise<void> {
  if (Date.now() - lastSyncAt < SYNC_INTERVAL_MS) return
  lastSyncAt = Date.now()
  try {
    await syncSystemChannelsNow()
  } catch (err) {
    lastSyncAt = 0
    throw err
  }
}

async function removeAutoBranchZumreChannels(): Promise<void> {
  await prisma.conversation.deleteMany({
    where: { systemKey: { startsWith: "channel:branch:" } },
  })
}

async function syncSystemChannelsNow(): Promise<void> {
  await removeAutoBranchZumreChannels()

  const activeYear = await prisma.academicYear.findFirst({
    where: { isActive: true, parentActiveYearId: null },
    select: { id: true },
  })
  const [admins, teachersWithSchedule, staff] = await Promise.all([
    prisma.staff.findMany({
      where: { isActive: true, department: { in: CHANNEL_ADMIN_DEPARTMENTS } },
      select: { id: true },
    }),
    prisma.schedule.findMany({
      where: activeYear ? { class: { academicYearId: activeYear.id } } : {},
      select: { teacherId: true },
      distinct: ["teacherId"],
    }),
    prisma.staff.findMany({
      where: { isActive: true },
      select: { id: true, department: true },
    }),
  ])

  const adminIds = new Set(admins.map((row) => row.id))
  const teachingIds = new Set(teachersWithSchedule.map((row) => row.teacherId))

  const definitions: { key: string; title: string; memberIds: Set<string> }[] = [
    {
      key: "channel:idare",
      title: "İdare",
      memberIds: idsWhere(staff, (row) =>
        ["SUPER_ADMIN", "MUDUR", "MUDUR_YARDIMCISI", "KURUCU", "OGRENCI_ISLERI"].includes(row.department)
      ),
    },
    {
      key: "channel:rehberlik",
      title: "Rehberlik",
      memberIds: idsWhere(staff, (row) => row.department === "REHBERLIK" || row.department === "BAS_REHBERLIK"),
    },
    {
      key: "channel:sinif-ogretmenleri",
      title: "Sınıf öğretmenleri",
      memberIds: idsWhere(staff, (row) => row.department === "OGRETMEN" && teachingIds.has(row.id)),
    },
  ]

  const existing = await prisma.conversation.findMany({
    where: { systemKey: { in: definitions.map((row) => row.key) } },
    select: {
      id: true,
      systemKey: true,
      title: true,
      participants: { select: { staffId: true, role: true } },
    },
  })
  const byKey = new Map(existing.map((row) => [row.systemKey, row]))

  for (const definition of definitions) {
    for (const adminId of adminIds) definition.memberIds.add(adminId)
    const current = byKey.get(definition.key)
    if (!current) {
      await prisma.conversation.create({
        data: {
          type: "GROUP",
          title: definition.title,
          systemKey: definition.key,
          membersCanPost: true,
          participants: {
            create: [...definition.memberIds].map((staffId) => ({
              staffId,
              role: adminIds.has(staffId) ? "ADMIN" : "MEMBER",
            })),
          },
        },
      })
      continue
    }
    if (current.title !== definition.title) {
      await prisma.conversation.update({ where: { id: current.id }, data: { title: definition.title } })
    }
    const have = new Map(
      current.participants.filter((row) => row.staffId).map((row) => [row.staffId as string, row.role])
    )
    const toAdd = [...definition.memberIds].filter((staffId) => !have.has(staffId))
    const toRemove = [...have.keys()].filter((staffId) => !definition.memberIds.has(staffId))
    if (toAdd.length > 0) {
      await prisma.conversationParticipant.createMany({
        data: toAdd.map((staffId) => ({
          conversationId: current.id,
          staffId,
          role: adminIds.has(staffId) ? ("ADMIN" as const) : ("MEMBER" as const),
        })),
        skipDuplicates: true,
      })
    }
    if (toRemove.length > 0) {
      await prisma.conversationParticipant.deleteMany({
        where: { conversationId: current.id, staffId: { in: toRemove } },
      })
    }
    const promote = [...adminIds].filter((staffId) => have.get(staffId) === "MEMBER")
    if (promote.length > 0) {
      await prisma.conversationParticipant.updateMany({
        where: { conversationId: current.id, staffId: { in: promote } },
        data: { role: "ADMIN" },
      })
    }
  }
}

function idsWhere(
  staff: { id: string; department: StaffDepartment }[],
  predicate: (row: (typeof staff)[number]) => boolean
) {
  return new Set(staff.filter(predicate).map((row) => row.id))
}

export async function teacherIdsForBranch(branchId: string): Promise<{ name: string; staffIds: string[] }> {
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { id: true, name: true, isActive: true },
  })
  if (!branch || !branch.isActive) {
    throw new Error("Branş bulunamadı")
  }
  const teachers = await prisma.staff.findMany({
    where: {
      isActive: true,
      department: "OGRETMEN",
      OR: [
        { branchLinks: { some: { branchId } } },
        { subject: { equals: branch.name, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  })
  return { name: branch.name, staffIds: teachers.map((row) => row.id) }
}
