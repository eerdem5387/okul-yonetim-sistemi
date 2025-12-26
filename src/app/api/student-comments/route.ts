import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

/**
 * GET /api/student-comments
 * Öğrenci görüşlerini listeler
 * 
 * Query:
 * - studentId?: string (Belirli öğrencinin görüşleri)
 * - staffId?: string (Belirli personelin yazdığı görüşler)
 * - commentType?: string (ACADEMIC, BEHAVIORAL, GENERAL)
 * - isPositive?: boolean (Olumlu/Olumsuz)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")
    const staffId = searchParams.get("staffId")
    const commentType = searchParams.get("commentType")
    const isPositive = searchParams.get("isPositive")

    const whereConditions: Prisma.StudentCommentWhereInput = {}

    if (studentId) {
      whereConditions.studentId = studentId
    }

    if (staffId) {
      whereConditions.staffId = staffId
    }

    if (commentType) {
      whereConditions.commentType = commentType as "ACADEMIC" | "BEHAVIORAL" | "GENERAL"
    }

    if (isPositive !== null) {
      whereConditions.isPositive = isPositive === "true"
    }

    const comments = await prisma.studentComment.findMany({
      where: whereConditions,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            grade: true,
            tcNumber: true,
          },
        },
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: true,
            position: true,
            subject: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({ comments })
  } catch (error) {
    console.error("Error fetching comments:", error)
    return NextResponse.json(
      { error: "Görüşler alınırken bir hata oluştu" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/student-comments
 * Yeni öğrenci görüşü oluşturur
 * 
 * Body:
 * - studentId: string
 * - staffId: string
 * - commentType: string (ACADEMIC, BEHAVIORAL, GENERAL)
 * - category?: string (Ders adı veya alan)
 * - content: string
 * - isPositive: boolean
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      studentId,
      staffId,
      commentType,
      category,
      content,
      isPositive,
    } = body

    // Validasyon
    if (!studentId || !staffId || !commentType || !content) {
      return NextResponse.json(
        { error: "Öğrenci, personel, görüş tipi ve içerik gereklidir" },
        { status: 400 }
      )
    }

    // Görüş oluştur
    const comment = await prisma.studentComment.create({
      data: {
        studentId,
        staffId,
        commentType,
        category: category || null,
        content,
        isPositive: isPositive !== undefined ? isPositive : true,
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            grade: true,
          },
        },
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      comment,
    })
  } catch (error) {
    console.error("Error creating comment:", error)
    return NextResponse.json(
      { error: "Görüş oluşturulurken bir hata oluştu" },
      { status: 500 }
    )
  }
}

