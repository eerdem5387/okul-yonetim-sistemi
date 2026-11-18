import type { Prisma } from "@prisma/client"
import type { NeredeyizActor } from "@/lib/neredeyiz/access"

/**
 * Rapor uç noktaları için ortak ders filtresi.
 * Yıl her zaman uygulanır; subjectId verilse bile yıl dışına çıkılmaz.
 * Öğretmen yalnız atandığı dersleri görür.
 */
export function buildSubjectFilter(
  searchParams: URLSearchParams,
  academicYearId: string,
  actor: NeredeyizActor,
): Prisma.SubjectWhereInput {
  const where: Prisma.SubjectWhereInput = { academicYearId }
  const grade = searchParams.get("grade")
  const section = searchParams.get("section")
  const subjectId = searchParams.get("subjectId")
  const classId = searchParams.get("classId")
  if (grade && Number.isFinite(Number.parseInt(grade, 10))) where.grade = Number.parseInt(grade, 10)
  if (section) where.section = section
  if (subjectId) where.id = subjectId
  if (classId) where.classId = classId
  if (actor.isTeacher && !actor.superAdmin) where.assignments = { some: { staffId: actor.staffId } }
  return where
}

export const SUBJECT_EVAL_SELECT = {
  id: true,
  name: true,
  grade: true,
  section: true,
  classId: true,
  academicYearId: true,
  assignments: { select: { staffId: true } },
} satisfies Prisma.SubjectSelect

export const LATEST_PROGRESS = {
  orderBy: { updatedAt: "desc" },
  take: 1,
} satisfies Prisma.Topic$progressArgs
