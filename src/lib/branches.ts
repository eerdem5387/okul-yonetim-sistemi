import { prisma } from "@/lib/prisma"

export const DEFAULT_BRANCH_NAMES = [
  "Türkçe",
  "Matematik",
  "Fen Bilimleri",
  "Sosyal Bilgiler",
  "İngilizce",
  "Din Kültürü",
  "Beden Eğitimi",
  "Müzik",
  "Görsel Sanatlar",
  "Bilişim Teknolojileri",
  "Fizik",
  "Kimya",
  "Biyoloji",
  "Tarih",
  "Coğrafya",
  "Felsefe",
  "Rehberlik",
  "Deneme Sınavı",
] as const

export function normalizeBranchName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ")
}

/** Branş adından subject etiketi (eski alan / gösterim). */
export function subjectLabelFromBranches(names: string[]): string | null {
  const cleaned = names.map(normalizeBranchName).filter(Boolean)
  if (cleaned.length === 0) return null
  return cleaned.join(", ")
}

export async function upsertBranchByName(name: string, sortOrder?: number) {
  const cleaned = normalizeBranchName(name)
  if (!cleaned) return null

  const existing = await prisma.branch.findFirst({
    where: { name: { equals: cleaned, mode: "insensitive" } },
  })
  if (existing) {
    if (!existing.isActive) {
      return prisma.branch.update({
        where: { id: existing.id },
        data: { isActive: true, name: cleaned },
      })
    }
    return existing
  }

  const maxOrder = await prisma.branch.aggregate({ _max: { sortOrder: true } })
  return prisma.branch.create({
    data: {
      name: cleaned,
      sortOrder: sortOrder ?? (maxOrder._max.sortOrder ?? -1) + 1,
      isActive: true,
    },
  })
}

/** ScheduleCourse ile Branch’i 1:1 senkron tut. */
export async function ensureCourseLinkedToBranch(courseId: string, courseName: string) {
  const branch = await upsertBranchByName(courseName)
  if (!branch) return null
  return prisma.scheduleCourse.update({
    where: { id: courseId },
    data: { branchId: branch.id, name: courseName },
    include: { branch: true },
  })
}

export async function syncStaffBranches(staffId: string, branchIds: string[]) {
  const unique = [...new Set(branchIds.map((id) => String(id).trim()).filter(Boolean))]

  await prisma.$transaction(async (tx) => {
    await tx.staffBranch.deleteMany({ where: { staffId } })
    if (unique.length > 0) {
      await tx.staffBranch.createMany({
        data: unique.map((branchId) => ({ staffId, branchId })),
        skipDuplicates: true,
      })
    }
    const branches = await tx.branch.findMany({
      where: { id: { in: unique }, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { name: true },
    })
    await tx.staff.update({
      where: { id: staffId },
      data: { subject: subjectLabelFromBranches(branches.map((b) => b.name)) },
    })
  })
}

export const branchInclude = {
  staffLinks: {
    include: {
      staff: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          department: true,
          isActive: true,
          subject: true,
        },
      },
    },
  },
  _count: {
    select: { staffLinks: true, scheduleCourses: true, subjects: true },
  },
} as const
