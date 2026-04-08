import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { syncRenewalPlaceholderForPrimaryYear } from "@/lib/academic-year-renewal-placeholder"
import { resolveCalendarFromBody } from "@/lib/academic-year-mutation"
import { runAcademicYearActivationRollover } from "@/lib/academic-year-rollover"

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
      startDate: academicYear.startDate?.toISOString() ?? null,
      endDate: academicYear.endDate?.toISOString() ?? null,
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

    const body = (await request.json()) as Record<string, unknown>
    const name = body.name as string | undefined

    if (!name?.trim()) {
      return NextResponse.json({ error: "Akademik yıl adı zorunludur" }, { status: 400 })
    }

    const activeFlag = body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive

    const cal = resolveCalendarFromBody(body, activeFlag)
    if (!cal.ok) {
      return NextResponse.json({ error: cal.error }, { status: 400 })
    }

    const prevOthersActive = await prisma.academicYear.findMany({
      where: { isActive: true, id: { not: params.id } },
      select: { id: true },
    })

    const shouldRollover = activeFlag && !existing.isActive && prevOthersActive.length > 0

    const academicYear = await prisma.$transaction(async (tx) => {
      if (activeFlag) {
        await tx.academicYear.updateMany({
          where: { isActive: true, id: { not: params.id } },
          data: { isActive: false },
        })
        if (prevOthersActive.length > 0) {
          await tx.academicYear.deleteMany({
            where: { parentActiveYearId: { in: prevOthersActive.map((p) => p.id) } },
          })
        }
      }
      if (shouldRollover) {
        await runAcademicYearActivationRollover(tx)
      }
      return tx.academicYear.update({
        where: { id: params.id },
        data: {
          name: name.trim(),
          startDate: cal.data.start,
          endDate: cal.data.end,
          isActive: activeFlag,
          weekendDays: cal.data.weekendDays,
          term1Start: cal.data.term1Start,
          term1End: cal.data.term1End,
          term2Start: cal.data.term2Start,
          term2End: cal.data.term2End,
        },
      })
    })

    await syncRenewalPlaceholderForPrimaryYear(academicYear.id)

    return NextResponse.json({
      ...academicYear,
      startDate: academicYear.startDate?.toISOString() ?? null,
      endDate: academicYear.endDate?.toISOString() ?? null,
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

/** Yalnızca aktif bayrağını kaldırır; takvim ve tatiller korunur (boş PUT gövdesiyle alan silinmez). */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const body = (await request.json()) as { action?: string }
    if (body.action !== "deactivate") {
      return NextResponse.json({ error: "Geçersiz işlem" }, { status: 400 })
    }

    const row = await prisma.academicYear.findUnique({ where: { id: params.id } })
    if (!row) {
      return NextResponse.json({ error: "Akademik yıl bulunamadı" }, { status: 404 })
    }
    if (row.parentActiveYearId) {
      return NextResponse.json(
        {
          error:
            "Bu kayıt otomatik oluşturulmuş «sonraki yıl» satırıdır; ana akademik yıldan yönetin.",
        },
        { status: 400 }
      )
    }
    if (!row.isActive) {
      return NextResponse.json({ error: "Bu yıl zaten aktif değil." }, { status: 400 })
    }

    const academicYear = await prisma.academicYear.update({
      where: { id: params.id },
      data: { isActive: false },
    })

    await syncRenewalPlaceholderForPrimaryYear(academicYear.id)

    return NextResponse.json({
      ...academicYear,
      startDate: academicYear.startDate?.toISOString() ?? null,
      endDate: academicYear.endDate?.toISOString() ?? null,
      term1Start: academicYear.term1Start?.toISOString() ?? null,
      term1End: academicYear.term1End?.toISOString() ?? null,
      term2Start: academicYear.term2Start?.toISOString() ?? null,
      term2End: academicYear.term2End?.toISOString() ?? null,
    })
  } catch (error) {
    console.error("Error deactivating academic year:", error)
    return NextResponse.json(
      { error: "Akademik yıl sonlandırılırken hata oluştu" },
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

