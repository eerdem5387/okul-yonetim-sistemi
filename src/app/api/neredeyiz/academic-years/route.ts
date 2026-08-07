import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { syncRenewalPlaceholderForPrimaryYear } from "@/lib/academic-year-renewal-placeholder"
import { runAcademicYearActivationRollover } from "@/lib/academic-year-rollover"
import { resolveCalendarFromBody } from "@/lib/academic-year-mutation"

function mapYearJson(r: {
  id: string
  name: string
  startDate: Date | null
  endDate: Date | null
  isActive: boolean
  isRenewalPeriod: boolean
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
    startDate: r.startDate?.toISOString() ?? null,
    endDate: r.endDate?.toISOString() ?? null,
    isActive: r.isActive,
    isRenewalPeriod: r.isRenewalPeriod,
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
      orderBy: [{ isActive: "desc" }, { startDate: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
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
    const body = (await request.json()) as Record<string, unknown>
    const name = body.name as string | undefined
    const activeFlag = Boolean(body.isActive)

    if (!name?.trim()) {
      return NextResponse.json({ error: "Akademik yıl adı zorunludur" }, { status: 400 })
    }

    const cal = resolveCalendarFromBody(body, activeFlag)
    if (!cal.ok) {
      return NextResponse.json({ error: cal.error }, { status: 400 })
    }

    if (activeFlag) {
      const prevActives = await prisma.academicYear.findMany({
        where: { isActive: true },
        select: { id: true },
      })

      const created = await prisma.$transaction(async (tx) => {
        await tx.academicYear.updateMany({ where: { isActive: true }, data: { isActive: false } })
        if (prevActives.length > 0) {
          await tx.academicYear.deleteMany({
            where: { parentActiveYearId: { in: prevActives.map((p) => p.id) } },
          })
        }
        if (prevActives.length > 0) {
          await runAcademicYearActivationRollover(tx)
        }
        return tx.academicYear.create({
          data: {
            name: name.trim(),
            startDate: cal.data.start,
            endDate: cal.data.end,
            isActive: true,
            weekendDays: cal.data.weekendDays,
            term1Start: cal.data.term1Start,
            term1End: cal.data.term1End,
            term2Start: cal.data.term2Start,
            term2End: cal.data.term2End,
          },
        })
      })

      await syncRenewalPlaceholderForPrimaryYear(created.id)
      return NextResponse.json(mapYearJson(created), { status: 201 })
    }

    const academicYear = await prisma.academicYear.create({
      data: {
        name: name.trim(),
        startDate: cal.data.start,
        endDate: cal.data.end,
        isActive: false,
        weekendDays: cal.data.weekendDays,
        term1Start: cal.data.term1Start,
        term1End: cal.data.term1End,
        term2Start: cal.data.term2Start,
        term2End: cal.data.term2End,
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
