import { parseStudentGradeLevel } from "@/lib/student-grade-level"

export const CLUB_GRADE_LEVELS = [5, 6, 7, 8, 9, 10, 11, 12] as const

const ORTAOKUL = [5, 6, 7, 8]
const LISE = [9, 10, 11, 12]

export function normalizeClubGradeLevels(raw: unknown): number[] {
  if (!Array.isArray(raw)) return []
  const levels = new Set<number>()
  for (const value of raw) {
    const n = typeof value === "number" ? value : parseInt(String(value), 10)
    if (n >= 5 && n <= 12) levels.add(n)
  }
  return [...levels].sort((a, b) => a - b)
}

/** Boş liste = henüz kısıtlanmamış, tüm 5–12. sınıflar. */
export function effectiveClubGradeLevels(gradeLevels: number[] | null | undefined): number[] {
  const levels = normalizeClubGradeLevels(gradeLevels)
  return levels.length === 0 ? [...CLUB_GRADE_LEVELS] : levels
}

export function clubMatchesStudentGrade(
  gradeLevels: number[] | null | undefined,
  studentGrade: string | null | undefined
): boolean {
  const level = parseStudentGradeLevel(studentGrade)
  if (level == null) return false
  return effectiveClubGradeLevels(gradeLevels).includes(level)
}

export function formatClubGradeLevels(gradeLevels: number[] | null | undefined): string {
  const levels = normalizeClubGradeLevels(gradeLevels)
  if (levels.length === 0 || levels.length === CLUB_GRADE_LEVELS.length) return "Tüm sınıflar"
  if (levels.length === ORTAOKUL.length && ORTAOKUL.every((n) => levels.includes(n))) return "Ortaokul (5-8)"
  if (levels.length === LISE.length && LISE.every((n) => levels.includes(n))) return "Lise (9-12)"
  return levels.map((n) => `${n}. sınıf`).join(", ")
}
