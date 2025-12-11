import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - Tüm konuları listele
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const unitId = searchParams.get("unitId")

    if (!unitId) {
      return NextResponse.json(
        { error: "Ünite ID zorunludur" },
        { status: 400 }
      )
    }

    const topics = await prisma.topic.findMany({
      where: { unitId },
      include: {
        progress: {
          orderBy: {
            createdAt: "desc",
          },
        },
        subTopics: {
          orderBy: {
            order: "asc",
          },
        },
      },
      orderBy: {
        order: "asc",
      },
    })

    return NextResponse.json(topics)
  } catch (error) {
    console.error("Error fetching topics:", error)
    return NextResponse.json(
      { error: "Konular getirilirken hata oluştu" },
      { status: 500 }
    )
  }
}

// POST - Yeni konu oluştur
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      unitId,
      name,
      order,
      plannedStartWeek,
      plannedEndWeek,
      plannedStartDate,
      plannedEndDate,
      estimatedDuration,
      description,
    } = body

    if (!unitId || !name || order === undefined) {
      return NextResponse.json(
        { error: "Ünite ID, konu adı ve sıra zorunludur" },
        { status: 400 }
      )
    }

    const topic = await prisma.topic.create({
      data: {
        unitId,
        name,
        order: parseInt(order.toString()),
        plannedStartWeek: plannedStartWeek ? parseInt(plannedStartWeek.toString()) : null,
        plannedEndWeek: plannedEndWeek ? parseInt(plannedEndWeek.toString()) : null,
        plannedStartDate: plannedStartDate ? new Date(plannedStartDate) : null,
        plannedEndDate: plannedEndDate ? new Date(plannedEndDate) : null,
        estimatedDuration: estimatedDuration ? parseInt(estimatedDuration.toString()) : null,
        description: description || null,
      },
    })

    return NextResponse.json(topic, { status: 201 })
  } catch (error) {
    console.error("Error creating topic:", error)
    return NextResponse.json(
      { error: "Konu oluşturulurken hata oluştu" },
      { status: 500 }
    )
  }
}

