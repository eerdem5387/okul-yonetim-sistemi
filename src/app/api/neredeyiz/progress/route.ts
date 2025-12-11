import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { ProgressStatus } from "@prisma/client"

// GET - Tüm ilerleme kayıtlarını listele
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const topicId = searchParams.get("topicId")
    const status = searchParams.get("status")
    const subjectId = searchParams.get("subjectId")
    const grade = searchParams.get("grade")
    const section = searchParams.get("section")

    const where: Record<string, unknown> = {}
    
    if (topicId) {
      where.topicId = topicId
    }
    if (status) {
      where.status = status as ProgressStatus
    }
    if (subjectId) {
      where.topic = {
        unit: {
          subjectId,
        },
      }
    } else if (grade || section) {
      // Sınıf veya şube filtresi varsa subject üzerinden filtrele
      const subjectWhere: Record<string, unknown> = {}
      if (grade) {
        subjectWhere.grade = parseInt(grade, 10)
      }
      if (section) {
        subjectWhere.section = section
      }
      where.topic = {
        unit: {
          subject: subjectWhere,
        },
      }
    }

    const progress = await prisma.progress.findMany({
      where,
      include: {
        topic: {
          include: {
            unit: {
              include: {
                subject: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(progress)
  } catch (error) {
    console.error("Error fetching progress:", error)
    return NextResponse.json(
      { error: "İlerleme kayıtları getirilirken hata oluştu" },
      { status: 500 }
    )
  }
}

// POST - Yeni ilerleme kaydı oluştur veya güncelle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      topicId,
      status,
      plannedDate,
      actualStartDate,
      actualEndDate,
      notes,
      reportedBy,
      markedBy,
    } = body

    if (!topicId || !status) {
      return NextResponse.json(
        { error: "Konu ID ve durum zorunludur" },
        { status: 400 }
      )
    }

    // Mevcut progress kaydını kontrol et
    const existingProgress = await prisma.progress.findFirst({
      where: { topicId },
    })

    let progress
    if (existingProgress) {
      // Güncelle
      progress = await prisma.progress.update({
        where: { id: existingProgress.id },
        data: {
          status: status as ProgressStatus,
          plannedDate: plannedDate ? new Date(plannedDate) : null,
          actualStartDate: actualStartDate ? new Date(actualStartDate) : null,
          actualEndDate: actualEndDate ? new Date(actualEndDate) : null,
          notes: notes || null,
          reportedBy: reportedBy || null,
          markedBy: markedBy || null,
          markedAt: markedBy ? new Date() : null,
        },
      })
    } else {
      // Yeni oluştur
      progress = await prisma.progress.create({
        data: {
          topicId,
          status: status as ProgressStatus,
          plannedDate: plannedDate ? new Date(plannedDate) : null,
          actualStartDate: actualStartDate ? new Date(actualStartDate) : null,
          actualEndDate: actualEndDate ? new Date(actualEndDate) : null,
          notes: notes || null,
          reportedBy: reportedBy || null,
          markedBy: markedBy || null,
          markedAt: markedBy ? new Date() : null,
        },
      })
    }

    return NextResponse.json(progress, { status: existingProgress ? 200 : 201 })
  } catch (error) {
    console.error("Error saving progress:", error)
    return NextResponse.json(
      { error: "İlerleme kaydı oluşturulurken hata oluştu" },
      { status: 500 }
    )
  }
}

