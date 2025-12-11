import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// POST - Derse öğretmen ata
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const body = await request.json()
    const { staffId } = body

    if (!staffId) {
      return NextResponse.json(
        { error: "Öğretmen ID zorunludur" },
        { status: 400 }
      )
    }

    const assignment = await prisma.subjectAssignment.create({
      data: {
        subjectId: params.id,
        staffId,
      },
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    return NextResponse.json(assignment, { status: 201 })
  } catch (error) {
    console.error("Error assigning teacher:", error)
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Bu öğretmen zaten bu derse atanmış" },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Öğretmen atanırken hata oluştu" },
      { status: 500 }
    )
  }
}

// DELETE - Ders-öğretmen atamasını kaldır
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const searchParams = request.nextUrl.searchParams
    const staffId = searchParams.get("staffId")

    if (!staffId) {
      return NextResponse.json(
        { error: "Öğretmen ID zorunludur" },
        { status: 400 }
      )
    }

    await prisma.subjectAssignment.delete({
      where: {
        subjectId_staffId: {
          subjectId: params.id,
          staffId,
        },
      },
    })

    return NextResponse.json({ message: "Atama başarıyla kaldırıldı" })
  } catch (error) {
    console.error("Error removing assignment:", error)
    return NextResponse.json(
      { error: "Atama kaldırılırken hata oluştu" },
      { status: 500 }
    )
  }
}

