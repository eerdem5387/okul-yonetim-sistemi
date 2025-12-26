import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

/**
 * GET /api/exams
 * Sınavları listeler
 * 
 * Query:
 * - grade?: number (Sınıf seviyesi)
 * - classId?: string (Sınıf ID - belirli sınıfa özel sınavlar)
 * - examType?: string (YKS, LGS, KPSS, DENEME, DIGER)
 * - isActive?: boolean
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const grade = searchParams.get("grade")
    const classId = searchParams.get("classId")
    const examType = searchParams.get("examType")
    const isActive = searchParams.get("isActive")

    const whereConditions: Prisma.ExamWhereInput = {}

    if (grade) {
      whereConditions.grade = parseInt(grade)
    }

    if (classId) {
      whereConditions.classId = classId
    }

    if (examType) {
      whereConditions.examType = examType as "YKS" | "LGS" | "KPSS" | "DENEME" | "DIGER"
    }

    if (isActive !== null) {
      whereConditions.isActive = isActive === "true"
    }

    const exams = await prisma.exam.findMany({
      where: whereConditions,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
            grade: true,
            section: true,
          },
        },
        results: {
          select: {
            id: true,
            studentId: true,
            totalScore: true,
            ranking: true,
          },
        },
      },
      orderBy: {
        examDate: "desc",
      },
    })

    return NextResponse.json({ exams })
  } catch (error) {
    console.error("Error fetching exams:", error)
    return NextResponse.json(
      { error: "Sınavlar alınırken bir hata oluştu" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/exams
 * Yeni sınav oluşturur
 * 
 * Body:
 * - name: string (Sınav adı)
 * - examType: string (YKS, LGS, KPSS, DENEME, DIGER)
 * - examDate: string (ISO date)
 * - scope: string (WHOLE_SCHOOL, GRADE, CLASS) - Sınav kapsamı
 * - grade?: number (Sınıf seviyesi - GRADE veya CLASS için)
 * - classId?: string (Sınıf ID - CLASS için)
 * - description?: string
 * - subjects?: object (JSON)
 * - createdById: string (Staff ID - rehberlik)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      examType,
      examDate,
      scope,
      grade,
      classId,
      description,
      subjects,
      createdById,
    } = body

    // Validasyon
    if (!name || !examType || !examDate || !scope || !createdById) {
      return NextResponse.json(
        { error: "Sınav adı, tipi, tarihi, kapsam ve oluşturan ID gereklidir" },
        { status: 400 }
      )
    }

    // Kapsam kontrolü
    if (scope === "GRADE" && !grade) {
      return NextResponse.json(
        { error: "Sınıf seviyesi bazlı sınavlar için grade gereklidir" },
        { status: 400 }
      )
    }

    if (scope === "CLASS" && !classId) {
      return NextResponse.json(
        { error: "Sınıf bazlı sınavlar için classId gereklidir" },
        { status: 400 }
      )
    }

    // Sınav oluştur
    const exam = await prisma.exam.create({
      data: {
        name,
        examType,
        examDate: new Date(examDate),
        grade: scope === "WHOLE_SCHOOL" ? null : parseInt(grade),
        classId: scope === "CLASS" ? classId : null,
        description,
        subjects: subjects || null,
        createdById,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
            grade: true,
            section: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      exam,
    })
  } catch (error) {
    console.error("Error creating exam:", error)
    return NextResponse.json(
      { error: "Sınav oluşturulurken bir hata oluştu" },
      { status: 500 }
    )
  }
}

