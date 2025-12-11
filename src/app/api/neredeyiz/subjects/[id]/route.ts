import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - Tek ders getir
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const subject = await prisma.subject.findUnique({
      where: { id: params.id },
      include: {
        academicYear: true,
        assignments: {
          include: {
            staff: true,
          },
        },
        units: {
          orderBy: {
            order: "asc",
          },
          include: {
            topics: {
              orderBy: {
                order: "asc",
              },
              include: {
                progress: true,
                subTopics: {
                  orderBy: {
                    order: "asc",
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!subject) {
      return NextResponse.json(
        { error: "Ders bulunamadı" },
        { status: 404 }
      )
    }

    return NextResponse.json(subject)
  } catch (error) {
    console.error("Error fetching subject:", error)
    return NextResponse.json(
      { error: "Ders getirilirken hata oluştu" },
      { status: 500 }
    )
  }
}

// PUT - Ders güncelle
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const body = await request.json()
    const { name, code, description } = body

    if (!name) {
      return NextResponse.json(
        { error: "Ders adı zorunludur" },
        { status: 400 }
      )
    }

    const subject = await prisma.subject.update({
      where: { id: params.id },
      data: {
        name,
        code: code || null,
        description: description || null,
      },
    })

    return NextResponse.json(subject)
  } catch (error) {
    console.error("Error updating subject:", error)
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json(
        { error: "Ders bulunamadı" },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: "Ders güncellenirken hata oluştu" },
      { status: 500 }
    )
  }
}

// DELETE - Ders sil
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    await prisma.subject.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: "Ders başarıyla silindi" })
  } catch (error) {
    console.error("Error deleting subject:", error)
    if (error instanceof Error && error.message.includes("Record to delete does not exist")) {
      return NextResponse.json(
        { error: "Ders bulunamadı" },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: "Ders silinirken hata oluştu" },
      { status: 500 }
    )
  }
}

