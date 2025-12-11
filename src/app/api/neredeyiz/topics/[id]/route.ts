import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - Tek bir konuyu getir
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params

    const topic = await prisma.topic.findUnique({
      where: { id: params.id },
      include: {
        unit: {
          include: {
            subject: {
              include: {
                academicYear: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        progress: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    })

    if (!topic) {
      return NextResponse.json(
        { error: "Konu bulunamadı" },
        { status: 404 }
      )
    }

    return NextResponse.json(topic)
  } catch (error) {
    console.error("Error fetching topic:", error)
    return NextResponse.json(
      { error: "Konu getirilirken hata oluştu" },
      { status: 500 }
    )
  }
}
