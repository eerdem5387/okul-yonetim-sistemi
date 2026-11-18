/** Öğrenci kaydındaki `grade` alanından 5–12 arası düzey çıkarır; tanınmayan biçimler için null. */
export function parseStudentGradeLevel(grade: string | null | undefined): number | null {
  if (!grade) return null
  const m = grade.match(/(\d{1,2})/)
  if (!m) return null
  const n = parseInt(m[1], 10)
  if (n >= 5 && n <= 12) return n
  return null
}

export function gradeLevelLabel(n: number): string {
  return `${n}. Sınıf`
}

/** Belirli bir sınıf düzeyi (5–12) için Prisma `where` parçası. */
export function gradeLevelWhereClause(n: number): Record<string, unknown> {
  return {
    OR: [
      { grade: { equals: `${n}. Sınıf`, mode: "insensitive" as const } },
      { grade: { equals: String(n), mode: "insensitive" as const } },
    ],
  }
}

/** Kademe filtresi: ortaokul (5–8) veya lise (9–12); tanınmayan değer → null. */
export function gradeBandWhereClause(band: string | null | undefined): Record<string, unknown> | null {
  if (band !== "ortaokul" && band !== "lise") return null
  const nums = band === "ortaokul" ? [5, 6, 7, 8] : [9, 10, 11, 12]
  const orParts: Record<string, unknown>[] = []
  for (const n of nums) {
    orParts.push({ grade: { equals: `${n}. Sınıf`, mode: "insensitive" as const } })
    orParts.push({ grade: { equals: String(n), mode: "insensitive" as const } })
  }
  return { OR: orParts }
}

/** Prisma `where`: yalnızca 5–12. sınıf etiketleri (liste ve özet sayımları için). */
export function k12GradeWhereClause(): Record<string, unknown> {
  const orParts: Record<string, unknown>[] = []
  for (let n = 5; n <= 12; n++) {
    orParts.push({ grade: { equals: `${n}. Sınıf`, mode: "insensitive" as const } })
    orParts.push({ grade: { equals: String(n), mode: "insensitive" as const } })
  }
  return { OR: orParts }
}

/** Mezun listesi (sınıf alanında «Mezun» veya içinde mezun geçen etiketler). */
export function graduatesWhereClause(): Record<string, unknown> {
  return {
    OR: [
      { grade: { equals: "Mezun", mode: "insensitive" as const } },
      { grade: { contains: "mezun", mode: "insensitive" as const } },
    ],
  }
}

/**
 * Kayıt yenilemede sözleşmedeki hedef sınıf: mevcut düzeyin bir üstü.
 * 12. sınıfta üst düzey olmadığı için hedef yine 12. sınıftır.
 */
export function renewalTargetClassLabel(
  currentGrade: string | null | undefined
): string | null {
  const level = parseStudentGradeLevel(currentGrade)
  if (level == null) return null
  if (level < 5 || level > 12) return null
  if (level >= 12) return gradeLevelLabel(12)
  return gradeLevelLabel(level + 1)
}
