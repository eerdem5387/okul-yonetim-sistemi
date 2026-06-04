import type { MufredatHafta } from "./mufredatlar/ingilizce"

export type MufredatPdfRow = {
  week: string
  subject: string
  objective: string
  practice: string
  achievements: string
}

export type MufredatPdfMonth = {
  label: string
  rows: MufredatPdfRow[]
}

/** PDF tablolarında hafta etiketi — İngilizce "Week" formatı */
export function formatMufredatWeekLabel(hafta: MufredatHafta["hafta"]): string {
  if (typeof hafta === "number") {
    return `${hafta}. Week`
  }

  const trimmed = String(hafta).trim()
  if (/\b(Week|Hafta)\b/i.test(trimmed)) {
    return trimmed.replace(/\bHafta\b/gi, "Week")
  }

  return `${trimmed}. Week`
}

/**
 * Müfredat satırlarını aylara gruplar.
 * `ay` yalnızca ay değişiminde set edildiği için son ay etiketi taşınır.
 */
export function buildMufredatMonths(mufredat: MufredatHafta[]): MufredatPdfMonth[] {
  const monthsMap = new Map<string, MufredatPdfRow[]>()
  let currentMonth = "Curriculum"

  for (const row of mufredat) {
    if (row.ay?.trim()) {
      currentMonth = row.ay.trim()
    }

    const pdfRow: MufredatPdfRow = {
      week: formatMufredatWeekLabel(row.hafta),
      subject: row.konu ?? "",
      objective: row.hedef ?? "",
      practice: row.icerik ?? "",
      achievements: row.hedef ?? "",
    }

    const bucket = monthsMap.get(currentMonth) ?? []
    bucket.push(pdfRow)
    monthsMap.set(currentMonth, bucket)
  }

  return [...monthsMap.entries()].map(([label, rows]) => ({ label, rows }))
}
