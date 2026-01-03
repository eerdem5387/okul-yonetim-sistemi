import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

/**
 * GET /api/homework
 * Ödevleri listeler
 * 
 * Query:
 * - teacherId?: string (Öğretmen ID - filtre)
 * - classId?: string (Sınıf ID - filtre)
 * - studentId?: string (Öğrenci ID - öğrencinin ödevleri)
 * - isActive?: boolean (Aktif ödevler)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teacherId = searchParams.get("teacherId")
    const classId = searchParams.get("classId")
    const studentId = searchParams.get("studentId")
    const isActive = searchParams.get("isActive")

    const whereConditions: Prisma.HomeworkWhereInput = {}

    if (teacherId) {
      whereConditions.teacherId = teacherId
    }

    if (classId) {
      whereConditions.classId = classId
    }

    if (isActive !== null) {
      whereConditions.isActive = isActive === "true"
    }

    // Öğrenci ID'si varsa, öğrenciye atanmış ödevleri getir
    if (studentId) {
      whereConditions.assignments = {
        some: {
          studentId,
        },
      }
    }

    const homeworks = await prisma.homework.findMany({
      where: whereConditions,
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            subject: true,
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
        assignments: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                grade: true,
              },
            },
          },
        },
      },
      orderBy: {
        dueDate: "asc",
      },
    })

    return NextResponse.json({ homeworks })
  } catch (error) {
    console.error("Error fetching homeworks:", error)
    return NextResponse.json(
      { error: "Ödevler alınırken bir hata oluştu" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/homework
 * Yeni ödev oluşturur
 * 
 * Body:
 * - title: string
 * - description: string
 * - dueDate: string (ISO date)
 * - subject?: string
 * - teacherId: string
 * - classId?: string (Tüm sınıfa)
 * - studentIds?: string[] (Belirli öğrencilere)
 * - attachmentUrl?: string
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title,
      description,
      dueDate,
      subject,
      teacherId,
      classId,
      studentIds,
      attachmentUrl,
    } = body

    // Validasyon - daha esnek
    if (!title || !description || !teacherId) {
      return NextResponse.json(
        { error: "Başlık, açıklama ve öğretmen ID gereklidir" },
        { status: 400 }
      )
    }

    // dueDate kontrolü - string veya Date olabilir
    if (!dueDate) {
      return NextResponse.json(
        { error: "Teslim tarihi gereklidir" },
        { status: 400 }
      )
    }

    // studentIds array kontrolü
    const validStudentIds = Array.isArray(studentIds) ? studentIds.filter(id => id) : []

    if (!classId && validStudentIds.length === 0) {
      return NextResponse.json(
        { error: "Sınıf ID veya öğrenci ID'leri gereklidir" },
        { status: 400 }
      )
    }

    // Ödev oluştur
    const homework = await prisma.homework.create({
      data: {
        title,
        description,
        dueDate: new Date(dueDate),
        subject,
        teacherId,
        classId: classId || null,
        attachmentUrl,
      },
    })

    // Ödev atamalarını oluştur
    let targetStudentIds: string[] = []

    if (validStudentIds.length > 0) {
      // Belirli öğrencilere ödev (classId varsa bile sadece seçilen öğrencilere atama yap)
      targetStudentIds = validStudentIds
    } else if (classId) {
      // Tüm sınıfa ödev - sınıftaki tüm öğrencileri getir
      const classStudents = await prisma.classStudent.findMany({
        where: { classId },
        select: { studentId: true },
      })
      targetStudentIds = classStudents.map((cs) => cs.studentId)
    }

    // Toplu ödev ataması
    if (targetStudentIds.length > 0) {
      await prisma.homeworkAssignment.createMany({
        data: targetStudentIds.map((studentId) => ({
          homeworkId: homework.id,
          studentId,
        })),
      })
    }

    // Oluşturulan ödevi detaylı getir
    const createdHomework = await prisma.homework.findUnique({
      where: { id: homework.id },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            subject: true,
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
        assignments: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                grade: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      homework: createdHomework,
    })
  } catch (error) {
    console.error("Error creating homework:", error)
    return NextResponse.json(
      { error: "Ödev oluşturulurken bir hata oluştu" },
      { status: 500 }
    )
  }
}

