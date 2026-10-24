import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/** Okul geneli akademik takvim: yıl iskeleti + tatiller + aksamalar */
export async function GET(request: NextRequest) {
  try {
    const academicYearId = request.nextUrl.searchParams.get("academicYearId")
    const year = academicYearId
      ? await prisma.academicYear.findUnique({ where: { id: academicYearId } })
      : await prisma.academicYear.findFirst({ where: { isActive: true } })

    if (!year || year.parentActiveYearId) {
      const years = await prisma.academicYear.findMany({
        where: { parentActiveYearId: null },
        orderBy: { name: "desc" },
        select: { id: true, name: true, isActive: true },
      })
      return NextResponse.json({ year: null, holidays: [], disruptions: [], years })
    }

    const [holidays, disruptions, years] = await Promise.all([
      prisma.holiday.findMany({
        where: { academicYearId: year.id },
        orderBy: { startDate: "asc" },
      }),
      prisma.disruption.findMany({
        where: { academicYearId: year.id },
        orderBy: { startDate: "asc" },
      }),
      prisma.academicYear.findMany({
        where: { parentActiveYearId: null },
        orderBy: { name: "desc" },
        select: { id: true, name: true, isActive: true },
      }),
    ])

    return NextResponse.json({
      year: {
        id: year.id,
        name: year.name,
        isActive: year.isActive,
        startDate: year.startDate?.toISOString() ?? null,
        endDate: year.endDate?.toISOString() ?? null,
        weekendDays: year.weekendDays,
        term1Start: year.term1Start?.toISOString() ?? null,
        term1End: year.term1End?.toISOString() ?? null,
        term2Start: year.term2Start?.toISOString() ?? null,
        term2End: year.term2End?.toISOString() ?? null,
      },
      holidays,
      disruptions,
      years,
    })
  } catch (error) {
    console.error("academic-calendar", error)
    return NextResponse.json({ error: "Akademik takvim yüklenemedi" }, { status: 500 })
  }
}
