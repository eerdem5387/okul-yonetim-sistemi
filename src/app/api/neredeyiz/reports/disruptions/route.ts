import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireNeredeyiz } from "@/lib/neredeyiz/access"
import { dayKey, loadSchoolCalendar, teachingDaysInclusive } from "@/lib/neredeyiz/calendar"
import { resolveNeredeyizYearId } from "@/lib/neredeyiz/year-scope"

const TYPE_LABELS: Record<string, string> = {
  PLANLI_OKUL: "Planlı/Okul Kaynaklı",
  PLANDISI_DOGAL: "Plan Dışı/Doğal",
  OGRETMEN_KAYNAKLI: "Öğretmen Kaynaklı",
}

// GET - Aksama sebep analizi. totalDays = kaybedilen DERS günü (hafta sonu ve işlenemez tatiller hariç).
export async function GET(request: NextRequest) {
  const guard = await requireNeredeyiz(request, "view")
  if (!guard.ok) return guard.response
  try {
    const academicYearId = await resolveNeredeyizYearId(request.nextUrl.searchParams)
    if (!academicYearId) {
      return NextResponse.json({ error: "Akademik yıl bulunamadı" }, { status: 400 })
    }

    const [disruptions, fullCal] = await Promise.all([
      prisma.disruption.findMany({ where: { academicYearId } }),
      loadSchoolCalendar(academicYearId),
    ])
    // Aksamanın kendisini düşmemek için aksamasız takvim
    const cal = { ...fullCal, disruptions: [] }

    const stats = new Map<string, { type: string; typeLabel: string; count: number; totalDays: number; percentage: number }>()
    let totalDays = 0
    for (const d of disruptions) {
      const days = teachingDaysInclusive(cal, dayKey(d.startDate), dayKey(d.endDate))
      totalDays += days
      const row = stats.get(d.type) ?? { type: d.type, typeLabel: TYPE_LABELS[d.type] ?? d.type, count: 0, totalDays: 0, percentage: 0 }
      row.count++
      row.totalDays += days
      stats.set(d.type, row)
    }
    for (const row of stats.values()) {
      row.percentage = totalDays > 0 ? Math.round((row.totalDays / totalDays) * 100) : 0
    }

    return NextResponse.json({
      academicYearId,
      disruptions: [...stats.values()],
      summary: {
        totalDisruptions: disruptions.length,
        totalDays,
        averageDaysPerDisruption: disruptions.length > 0 ? Math.round(totalDays / disruptions.length) : 0,
        unit: "ders_gunu",
      },
    })
  } catch (error) {
    console.error("Error generating disruption report:", error)
    return NextResponse.json({ error: "Rapor oluşturulurken hata oluştu" }, { status: 500 })
  }
}
