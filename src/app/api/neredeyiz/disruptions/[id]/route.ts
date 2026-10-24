import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { DisruptionType } from "@prisma/client"
import { parseDisruptionScope } from "@/lib/neredeyiz/disruption-scope"

// GET - Tek aksama getir
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const disruption = await prisma.disruption.findUnique({
      where: { id: params.id },
      include: {
        academicYear: true,
      },
    })

    if (!disruption) {
      return NextResponse.json(
        { error: "Aksama bulunamadı" },
        { status: 404 }
      )
    }

    return NextResponse.json(disruption)
  } catch (error) {
    console.error("Error fetching disruption:", error)
    return NextResponse.json(
      { error: "Aksama getirilirken hata oluştu" },
      { status: 500 }
    )
  }
}

// PUT - Aksama güncelle
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const body = await request.json()
    const { type, reason, startDate, endDate, affectedSubjects, affectedClassIds, affectedStaffIds, scope } = body

    if (!type || !reason || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Tip, sebep, başlangıç ve bitiş tarihi zorunludur" },
        { status: 400 }
      )
    }

    const parsed = parseDisruptionScope({
      scope,
      affectedSubjects,
      affectedClassIds,
      affectedStaffIds,
    })
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const disruption = await prisma.disruption.update({
      where: { id: params.id },
      data: {
        type: type as DisruptionType,
        scope: parsed.scope,
        reason,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        affectedSubjects: parsed.affectedSubjects,
        affectedClassIds: parsed.affectedClassIds,
        affectedStaffIds: parsed.affectedStaffIds,
      },
    })

    return NextResponse.json(disruption)
  } catch (error) {
    console.error("Error updating disruption:", error)
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json(
        { error: "Aksama bulunamadı" },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: "Aksama güncellenirken hata oluştu" },
      { status: 500 }
    )
  }
}

// DELETE - Aksama sil
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    await prisma.disruption.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: "Aksama başarıyla silindi" })
  } catch (error) {
    console.error("Error deleting disruption:", error)
    if (error instanceof Error && error.message.includes("Record to delete does not exist")) {
      return NextResponse.json(
        { error: "Aksama bulunamadı" },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: "Aksama silinirken hata oluştu" },
      { status: 500 }
    )
  }
}

