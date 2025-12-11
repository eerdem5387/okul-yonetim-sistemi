import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - Tüm üniteleri listele
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const subjectId = searchParams.get("subjectId")

    if (!subjectId) {
      return NextResponse.json(
        { error: "Ders ID zorunludur" },
        { status: 400 }
      )
    }

    const units = await prisma.unit.findMany({
      where: { subjectId },
      include: {
        topics: {
          orderBy: {
            order: "asc",
          },
        },
      },
      orderBy: {
        order: "asc",
      },
    })

    return NextResponse.json(units)
  } catch (error) {
    console.error("Error fetching units:", error)
    return NextResponse.json(
      { error: "Üniteler getirilirken hata oluştu" },
      { status: 500 }
    )
  }
}

// POST - Yeni ünite oluştur
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { subjectId, name, order, description } = body

    if (!subjectId || !name || order === undefined) {
      return NextResponse.json(
        { error: "Ders ID, ünite adı ve sıra zorunludur" },
        { status: 400 }
      )
    }

    const unit = await prisma.unit.create({
      data: {
        subjectId,
        name,
        order: parseInt(order.toString()),
        description: description || null,
      },
    })

    return NextResponse.json(unit, { status: 201 })
  } catch (error) {
    console.error("Error creating unit:", error)
    return NextResponse.json(
      { error: "Ünite oluşturulurken hata oluştu" },
      { status: 500 }
    )
  }
}

