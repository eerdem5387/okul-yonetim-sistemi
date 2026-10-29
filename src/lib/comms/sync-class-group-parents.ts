import { prisma } from "@/lib/prisma"

/** Sınıftaki öğrencilerin veli hesap ID'lerini bul (ParentStudent + studentTcNumber). */
export async function resolveParentIdsForClass(classId: string): Promise<string[]> {
  const assignments = await prisma.classStudent.findMany({
    where: { classId },
    select: { student: { select: { id: true, tcNumber: true } } },
  })
  const studentIds = assignments.map((a) => a.student.id)
  const tcNumbers = assignments.map((a) => a.student.tcNumber).filter(Boolean)

  if (studentIds.length === 0) return []

  const [byLink, byTc] = await Promise.all([
    prisma.parentStudent.findMany({
      where: {
        studentId: { in: studentIds },
        parent: { isActive: true },
      },
      select: { parentId: true },
    }),
    tcNumbers.length
      ? prisma.parent.findMany({
          where: { studentTcNumber: { in: tcNumbers }, isActive: true },
          select: { id: true },
        })
      : Promise.resolve([] as { id: string }[]),
  ])

  return [...new Set([...byLink.map((p) => p.parentId), ...byTc.map((p) => p.id)])]
}

/**
 * Sınıfa bağlı tüm ClassGroup'lara eksik veli üyelerini ekler.
 * Yeni üyeler için mevcut sınıf duyurularına ClassAnnouncementAck backfill eder.
 */
export async function syncClassGroupParentsForClass(classId: string): Promise<{
  parentIds: string[]
  membersAdded: number
  acksAdded: number
}> {
  const parentIds = await resolveParentIdsForClass(classId)
  const groups = await prisma.classGroup.findMany({
    where: { classId },
    select: { id: true },
  })
  if (groups.length === 0) {
    return { parentIds, membersAdded: 0, acksAdded: 0 }
  }

  let membersAdded = 0
  let acksAdded = 0

  for (const group of groups) {
    if (parentIds.length > 0) {
      const memberResult = await prisma.classGroupMember.createMany({
        data: parentIds.map((parentId) => ({
          classGroupId: group.id,
          parentId,
          role: "PARENT" as const,
        })),
        skipDuplicates: true,
      })
      membersAdded += memberResult.count
    }

    const announcements = await prisma.classAnnouncement.findMany({
      where: { classGroupId: group.id },
      select: { id: true },
    })
    if (announcements.length === 0 || parentIds.length === 0) continue

    const ackResult = await prisma.classAnnouncementAck.createMany({
      data: announcements.flatMap((a) =>
        parentIds.map((parentId) => ({
          announcementId: a.id,
          parentId,
        }))
      ),
      skipDuplicates: true,
    })
    acksAdded += ackResult.count
  }

  return { parentIds, membersAdded, acksAdded }
}

/** Velinin öğrencilerinin sınıflarındaki grup üyeliklerini senkronize et. */
export async function syncClassGroupParentsForParent(parentId: string): Promise<void> {
  const parent = await prisma.parent.findUnique({
    where: { id: parentId },
    select: {
      studentTcNumber: true,
      students: { select: { studentId: true } },
    },
  })
  if (!parent) return

  const studentIds = new Set(parent.students.map((s) => s.studentId))
  if (parent.studentTcNumber) {
    const byTc = await prisma.student.findUnique({
      where: { tcNumber: parent.studentTcNumber },
      select: { id: true },
    })
    if (byTc) studentIds.add(byTc.id)
  }
  if (studentIds.size === 0) return

  const assignments = await prisma.classStudent.findMany({
    where: { studentId: { in: [...studentIds] } },
    select: { classId: true },
  })
  const classIds = [...new Set(assignments.map((a) => a.classId))]
  for (const classId of classIds) {
    await syncClassGroupParentsForClass(classId)
  }
}
