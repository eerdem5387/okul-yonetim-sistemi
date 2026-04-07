import type { Prisma } from "@prisma/client"
import { gradeLevelLabel, parseStudentGradeLevel } from "@/lib/student-grade-level"

export const GRADUATE_GRADE_LABEL = "Mezun"

/**
 * Yıl devri: 5–7 ve 9–11 bir üst düzeye; 8 ve 12 mezun olur.
 * Tanınmayan / mezun etiketleri değiştirilmez.
 */
export function computeNextGradeAfterRollover(grade: string): string | null {
  const level = parseStudentGradeLevel(grade)
  if (level === null) return null
  if (level === 8 || level === 12) return GRADUATE_GRADE_LABEL
  if (level >= 5 && level <= 7) return gradeLevelLabel(level + 1)
  if (level >= 9 && level <= 11) return gradeLevelLabel(level + 1)
  return null
}

/** Aktif akademik yıla geçişte: tüm sınıf atamalarını sil, öğrenci düzeylerini yükselt. */
export async function runAcademicYearActivationRollover(tx: Prisma.TransactionClient): Promise<void> {
  await tx.classStudent.deleteMany({})
  const students = await tx.student.findMany({ select: { id: true, grade: true } })
  for (const s of students) {
    const next = computeNextGradeAfterRollover(s.grade)
    if (next != null && next !== s.grade) {
      await tx.student.update({ where: { id: s.id }, data: { grade: next } })
    }
  }
}
