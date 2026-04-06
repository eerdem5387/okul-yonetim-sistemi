import { gradeLevelLabel, parseStudentGradeLevel } from "@/lib/student-grade-level"

function isMezunGrade(grade: string): boolean {
  const t = grade.trim().toLowerCase()
  return t === "mezun" || t.includes("mezun")
}

/**
 * Öğrenci yönetimi özeti ile aynı: mezunlar ve yalnızca gelecek yıl ön kayıtlı olanlar hariç,
 * kalanların `student.grade` düzeyine göre sayımı (5–12).
 */
export function enrolledCountsFromStudentRows(
  students: { id: string; grade: string }[],
  futureYearOnlyNewRegistrationStudentIds: Set<string>
): Record<string, number> {
  const byGrade: Record<string, number> = {}
  for (let g = 5; g <= 12; g++) {
    byGrade[gradeLevelLabel(g)] = 0
  }

  for (const s of students) {
    if (isMezunGrade(s.grade)) continue
    if (futureYearOnlyNewRegistrationStudentIds.has(s.id)) continue
    const level = parseStudentGradeLevel(s.grade)
    if (level == null) continue
    const label = gradeLevelLabel(level)
    if (byGrade[label] !== undefined) {
      byGrade[label] += 1
    }
  }

  return byGrade
}

export type GradeFractionRow = {
  numerator: number
  total: number
  /** Bir ondalık basamak (örn. 79.5) */
  percent: number
}

export function buildGradeFractionRows(
  numerators: Record<string, number>,
  totals: Record<string, number>
): Record<string, GradeFractionRow> {
  const out: Record<string, GradeFractionRow> = {}
  for (let g = 5; g <= 12; g++) {
    const label = gradeLevelLabel(g)
    const numerator = numerators[label] ?? 0
    const total = totals[label] ?? 0
    out[label] = {
      numerator,
      total,
      percent: total > 0 ? Math.round((numerator / total) * 1000) / 10 : 0,
    }
  }
  return out
}
