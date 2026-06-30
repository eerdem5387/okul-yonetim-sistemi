/** Kayıt yenileme ekranlarında ortak sınıf etiketleri ve filtre mantığı */

export const RENEWAL_GRADE_RULE_SUMMARY =
  "Kayıt yenileme gelecek yıl için sözleşmedir. Öğrencinin mevcut sınıfı bu yıl boyunca değişmez; sınıf yükseltme yalnızca akademik yıl devrinde veya «Sınıf Yükselt» ile yapılır."

export const RENEWAL_STATS_FRACTION_HINT =
  "X/Y = bu yıl X. sınıftaki öğrencilerden Y'si hedef akademik yıl için yenileme yaptı."

export function normalizeGradeLabel(value: string | null | undefined): string {
  const gradeStr = String(value ?? "").trim()
  if (!gradeStr || gradeStr === "Belirtilmemiş") return gradeStr || "Belirtilmemiş"
  if (gradeStr.includes(". Sınıf") || gradeStr.includes("Sınıf")) return gradeStr
  const gradeNum = gradeStr.replace(/\D/g, "")
  if (/^\d+$/.test(gradeNum)) return `${gradeNum}. Sınıf`
  return gradeStr
}

export interface RenewalGradeSource {
  student?: { grade?: string | null } | null
  contractData?: unknown
}

export function getRenewalGrades(source: RenewalGradeSource): {
  current: string | null
  target: string | null
} {
  const contractData = (source.contractData ?? {}) as Record<string, unknown>
  const currentRaw = source.student?.grade
  const targetRaw = contractData.studentClass as string | undefined

  const current = currentRaw?.trim() ? normalizeGradeLabel(currentRaw) : null
  const target = targetRaw?.trim() ? normalizeGradeLabel(targetRaw) : null

  return { current, target }
}

export function renewalMatchesCurrentGradeFilter(
  source: RenewalGradeSource,
  filterGrade: string
): boolean {
  if (!filterGrade || filterGrade === "all") return true
  const { current } = getRenewalGrades(source)
  if (!current) return false
  return normalizeGradeLabel(current) === normalizeGradeLabel(filterGrade)
}
