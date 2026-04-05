import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateAcademicYearTermDates } from "@/lib/academic-year-terms"
import { syncRenewalPlaceholderForPrimaryYear } from "@/lib/academic-year-renewal-placeholder"

// GET - Tek akademik yıl getir
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const academicYear = await prisma.academicYear.findUnique({
      where: { id: params.id },
      include: {
        subjects: {
          include: {
            assignments: {
              include: {
                staff: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
        holidays: true,
        disruptions: true,
      },
    })

    if (!academicYear) {
      return NextResponse.json(
        { error: "Akademik yıl bulunamadı" },
        { status: 404 }
      )
    }

    const json = {
      ...academicYear,
      startDate: academicYear.startDate.toISOString(),
      endDate: academicYear.endDate.toISOString(),
      term1Start: academicYear.term1Start?.toISOString() ?? null,
      term1End: academicYear.term1End?.toISOString() ?? null,
      term2Start: academicYear.term2Start?.toISOString() ?? null,
      term2End: academicYear.term2End?.toISOString() ?? null,
    }
    return NextResponse.json({
      academicYear: json,
      ...json,
    })
  } catch (error) {
    console.error("Error fetching academic year:", error)
    return NextResponse.json(
      { error: "Akademik yıl getirilirken hata oluştu" },
      { status: 500 }
    )
  }
}

// PUT - Akademik yıl güncelle
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const existing = await prisma.academicYear.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json({ error: "Akademik yıl bulunamadı" }, { status: 404 })
    }
    if (existing.parentActiveYearId) {
      return NextResponse.json(
        { error: "Otomatik oluşturulan sonraki yıl kaydı buradan düzenlenemez; ana yılı güncelleyin." },
        { status: 400 }
      )
    }

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

    const activeFlag = isActive !== undefined ? Boolean(isActive) : existing.isActive

    if (activeFlag) {
      const prevActives = await prisma.academicYear.findMany({
        where: { isActive: true, id: { not: params.id } },
        select: { id: true },
      })
      await prisma.academicYear.updateMany({
        where: { isActive: true, id: { not: params.id } },
        data: { isActive: false },
      })
      if (prevActives.length > 0) {
        await prisma.academicYear.deleteMany({
          where: { parentActiveYearId: { in: prevActives.map((p) => p.id) } },
        })
      }
    }

    const academicYear = await prisma.academicYear.update({
      where: { id: params.id },
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

    return NextResponse.json({
      ...academicYear,
      startDate: academicYear.startDate.toISOString(),
      endDate: academicYear.endDate.toISOString(),
      term1Start: academicYear.term1Start?.toISOString() ?? null,
      term1End: academicYear.term1End?.toISOString() ?? null,
      term2Start: academicYear.term2Start?.toISOString() ?? null,
      term2End: academicYear.term2End?.toISOString() ?? null,
    })
  } catch (error) {
    console.error("Error updating academic year:", error)
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json(
        { error: "Akademik yıl bulunamadı" },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: "Akademik yıl güncellenirken hata oluştu" },
      { status: 500 }
    )
  }
}

// DELETE - Akademik yıl sil
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const row = await prisma.academicYear.findUnique({ where: { id: params.id } })
    if (row?.parentActiveYearId) {
      return NextResponse.json(
        {
          error:
            "Bu kayıt aktif yıl için otomatik oluşturulmuş «sonraki yıl» satırıdır; doğrudan silinemez. Ana akademik yılı silin veya güncelleyin.",
        },
        { status: 400 }
      )
    }
    await prisma.academicYear.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: "Akademik yıl başarıyla silindi" })
  } catch (error) {
    console.error("Error deleting academic year:", error)
    if (error instanceof Error && error.message.includes("Record to delete does not exist")) {
      return NextResponse.json(
        { error: "Akademik yıl bulunamadı" },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: "Akademik yıl silinirken hata oluştu" },
      { status: 500 }
    )
  }
}

