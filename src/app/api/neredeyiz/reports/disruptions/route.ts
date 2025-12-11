import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - Aksama sebep analizi raporu
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const academicYearId = searchParams.get("academicYearId")

    if (!academicYearId) {
      return NextResponse.json(
        { error: "Akademik yıl ID zorunludur" },
        { status: 400 }
      )
    }

    const disruptions = await prisma.disruption.findMany({
      where: { academicYearId },
    })

    // Aksama tipine göre grupla ve süre hesapla
    const disruptionStats: Record<
      string,
      {
        type: string
        typeLabel: string
        count: number
        totalDays: number
        percentage: number
      }
    > = {}

    let totalDays = 0

    disruptions.forEach((disruption) => {
      const startDate = new Date(disruption.startDate)
      const endDate = new Date(disruption.endDate)
      const days = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1

      totalDays += days

      const typeLabel =
        disruption.type === "PLANLI_OKUL"
          ? "Planlı/Okul Kaynaklı"
          : disruption.type === "PLANDISI_DOGAL"
          ? "Plan Dışı/Doğal"
          : "Öğretmen Kaynaklı"

      if (!disruptionStats[disruption.type]) {
        disruptionStats[disruption.type] = {
          type: disruption.type,
          typeLabel,
          count: 0,
          totalDays: 0,
          percentage: 0,
        }
      }

      disruptionStats[disruption.type].count++
      disruptionStats[disruption.type].totalDays += days
    })

    // Yüzde hesaplama
    Object.keys(disruptionStats).forEach((type) => {
      disruptionStats[type].percentage =
        totalDays > 0
          ? Math.round((disruptionStats[type].totalDays / totalDays) * 100)
          : 0
    })

    return NextResponse.json({
      disruptions: Object.values(disruptionStats),
      summary: {
        totalDisruptions: disruptions.length,
        totalDays,
        averageDaysPerDisruption:
          disruptions.length > 0
            ? Math.round(totalDays / disruptions.length)
            : 0,
      },
    })
  } catch (error) {
    console.error("Error generating disruption report:", error)
    return NextResponse.json(
      { error: "Rapor oluşturulurken hata oluştu" },
      { status: 500 }
    )
  }
}

