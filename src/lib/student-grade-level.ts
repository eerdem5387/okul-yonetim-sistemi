/** Öğrenci kaydındaki `grade` alanından 5–12 arası düzey çıkarır; Mezun vb. için null. */
export function parseStudentGradeLevel(grade: string | null | undefined): number | null {
  if (!grade) return null
  const t = grade.trim().toLowerCase()
  if (t.includes("mezun")) return null
  const m = grade.match(/(\d{1,2})/)
  if (!m) return null
  const n = parseInt(m[1], 10)
  if (n >= 5 && n <= 12) return n
  return null
}

export function gradeLevelLabel(n: number): string {
  return `${n}. Sınıf`
}
