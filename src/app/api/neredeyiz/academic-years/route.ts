import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateAcademicYearTermDates } from "@/lib/academic-year-terms"
import { syncRenewalPlaceholderForPrimaryYear } from "@/lib/academic-year-renewal-placeholder"

function mapYearJson(r: {
  id: string
  name: string
  startDate: Date
  endDate: Date
  isActive: boolean
  weekendDays: string[]
  term1Start: Date | null
  term1End: Date | null
  term2Start: Date | null
  term2End: Date | null
  parentActiveYearId: string | null
}) {
  return {
    id: r.id,
    name: r.name,
    startDate: r.startDate.toISOString(),
    endDate: r.endDate.toISOString(),
    isActive: r.isActive,
    weekendDays: r.weekendDays,
    term1Start: r.term1Start?.toISOString() ?? null,
    term1End: r.term1End?.toISOString() ?? null,
    term2Start: r.term2Start?.toISOString() ?? null,
    term2End: r.term2End?.toISOString() ?? null,
    parentActiveYearId: r.parentActiveYearId,
  }
}

// GET — varsayılan: yalnızca ana kayıtlar (otomatik «sonraki yıl» satırları gizli). forContracts=1: tüm satırlar (kayıt sözleşmeleri).
export async function GET(request: NextRequest) {
  try {
    const forContracts = new URL(request.url).searchParams.get("forContracts") === "1"
    const academicYears = await prisma.academicYear.findMany({
      where: forContracts ? undefined : { parentActiveYearId: null },
      orderBy: {
        startDate: "desc",
      },
    })

    return NextResponse.json(academicYears.map(mapYearJson))
  } catch (error) {
    console.error("Error fetching academic years:", error)
    return NextResponse.json(
      { error: "Akademik yıllar getirilirken hata oluştu" },
      { status: 500 }
    )
  }
}

// POST — Yeni akademik yıl (yalnızca ana kayıt; parentActiveYearId istemciden kabul edilmez)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, startDate, endDate, isActive, weekendDays } = body
    const term1Start = body.term1Start as string | undefined
    const term1End = body.term1End as string | undefined
    const term2Start = body.term2Start as string | undefined
    const term2End = body.term2End as string | undefined

    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Ad, başlangıç ve bitiş tarihi zorunludur" },
        { status: 400 }
      )
    }

    if (!term1Start || !term1End || !term2Start || !term2End) {
      return NextResponse.json(
        { error: "1. ve 2. dönem başlangıç/bitiş tarihleri zorunludur" },
        { status: 400 }
      )
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: "Geçersiz tarih formatı" }, { status: 400 })
    }

    if (start >= end) {
      return NextResponse.json(
        { error: "Bitiş tarihi başlangıç tarihinden sonra olmalıdır" },
        { status: 400 }
      )
    }

    const termCheck = validateAcademicYearTermDates({
      yearStart: start,
      yearEnd: end,
      term1Start,
      term1End,
      term2Start,
      term2End,
    })
    if (!termCheck.ok) {
      return NextResponse.json({ error: termCheck.error }, { status: 400 })
    }

    const validWeekendDays =
      weekendDays?.filter((day: string) => day === "SATURDAY" || day === "SUNDAY") || []

    const activeFlag = isActive || false

    if (activeFlag) {
      const prevActives = await prisma.academicYear.findMany({
        where: { isActive: true },
        select: { id: true },
      })
      await prisma.academicYear.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      })
      if (prevActives.length > 0) {
        await prisma.academicYear.deleteMany({
          where: { parentActiveYearId: { in: prevActives.map((p) => p.id) } },
        })
      }
    }

    const academicYear = await prisma.academicYear.create({
      data: {
        name: name.trim(),
        startDate: start,
        endDate: end,
        isActive: activeFlag,
        weekendDays: validWeekendDays,
        term1Start: new Date(term1Start),
        term1End: new Date(term1End),
        term2Start: new Date(term2Start),
        term2End: new Date(term2End),
      },
    })

    await syncRenewalPlaceholderForPrimaryYear(academicYear.id)

    return NextResponse.json(mapYearJson(academicYear), { status: 201 })
  } catch (error) {
    console.error("Error creating academic year:", error)
    return NextResponse.json(
      { error: "Akademik yıl oluşturulurken hata oluştu" },
      { status: 500 }
    )
  }
}
