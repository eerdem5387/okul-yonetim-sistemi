import { gradeLevelLabel, parseStudentGradeLevel } from "@/lib/student-grade-level"

/**
 * Öğrenci yönetimi özeti ile aynı: yalnızca 5–12. sınıf olarak tanınan kayıtlar;
 * gelecek yıl yalnızca ön kayıtlı olanlar hariç, `student.grade` düzeyine göre sayım.
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

/** Kayıt yenileme / yeni kayıt sayfalarında ortak sınıf kartı kırılımı. */
export type EnrollmentRegistrationGradeBreakdown = {
  mevcut: number
  newRegistration: number
  renewed: number
  notRenewed: number
  total: number
  /** Yenileme oranı: renewed / (renewed + notRenewed) */
  percent: number
  /** Yeni kayıt oranı: newRegistration / mevcut */
  newRegistrationPercent: number
}

/**
 * Açık dönem bağlamındaki öğrenci kümelerine göre sınıf bazlı tutarlı sayımlar.
 * Kayıt yenileme ve yeni kayıt istatistikleri aynı fonksiyonu kullanmalı.
 */
export function buildEnrollmentRegistrationGradeBreakdown(params: {
  students: Array<{ id: string; grade: string }>
  renewedStudentIds: Set<string>
  newRegistrationStudentIds: Set<string>
  newRegistrationActiveYearStudentIds: Set<string>
  futureYearOnlyNewRegistrationStudentIds: Set<string>
}): Record<string, EnrollmentRegistrationGradeBreakdown> {
  const {
    students,
    renewedStudentIds,
    newRegistrationStudentIds,
    newRegistrationActiveYearStudentIds,
    futureYearOnlyNewRegistrationStudentIds,
  } = params

  const out: Record<string, EnrollmentRegistrationGradeBreakdown> = {}
  for (let g = 5; g <= 12; g++) {
    const lab = gradeLevelLabel(g)
    out[lab] = {
      mevcut: 0,
      newRegistration: 0,
      renewed: 0,
      notRenewed: 0,
      total: 0,
      percent: 0,
      newRegistrationPercent: 0,
    }
  }

  for (const s of students) {
    if (futureYearOnlyNewRegistrationStudentIds.has(s.id)) continue
    const level = parseStudentGradeLevel(s.grade)
    if (level == null) continue
    const lab = gradeLevelLabel(level)
    const row = out[lab]
    if (!row) continue

    const isNewReg =
      newRegistrationActiveYearStudentIds.has(s.id) ||
      (newRegistrationStudentIds.has(s.id) && !renewedStudentIds.has(s.id))
    const isRenewed =
      renewedStudentIds.has(s.id) && !newRegistrationStudentIds.has(s.id)

    row.mevcut += 1
    row.total += 1

    if (isNewReg) {
      row.newRegistration += 1
    } else if (isRenewed) {
      row.renewed += 1
    } else {
      row.notRenewed += 1
    }
  }

  for (let g = 5; g <= 12; g++) {
    const lab = gradeLevelLabel(g)
    const row = out[lab]
    const returning = row.renewed + row.notRenewed
    row.percent =
      returning > 0 ? Math.round((row.renewed / returning) * 1000) / 10 : 0
    row.newRegistrationPercent =
      row.mevcut > 0
        ? Math.round((row.newRegistration / row.mevcut) * 1000) / 10
        : 0
  }

  return out
}
