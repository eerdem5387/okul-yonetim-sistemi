import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

/**
 * GET /api/classes/[id]/students
 * Sınıftaki öğrencileri getirir
 * 
 * Yetki: Yönetici, Müdür, Öğrenci İşleri, Rehberlik
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const { id: classId } = params

    // Sınıf kontrolü
    const classData = await prisma.class.findUnique({
      where: { id: classId },
    })

    if (!classData) {
      return NextResponse.json(
        { error: "Sınıf bulunamadı" },
        { status: 404 }
      )
    }

    // Sınıftaki öğrencileri getir
    const classStudents = await prisma.classStudent.findMany({
      where: { classId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            tcNumber: true,
            grade: true,
            birthDate: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: {
        student: {
          firstName: "asc",
        },
      },
    })

    return NextResponse.json({
      students: classStudents.map((cs) => cs.student),
      class: {
        id: classData.id,
        name: classData.name,
        grade: classData.grade,
        section: classData.section,
      },
    })
  } catch (error) {
    console.error("Error fetching class students:", error)
    return NextResponse.json(
      { error: "Öğrenciler getirilirken bir hata oluştu" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/classes/[id]/students
 * Sınıfa öğrenci ekler
 * 
 * Body:
 * - studentIds: string[] - Eklenecek öğrenci ID'leri
 * 
 * Yetki: Yönetici, Müdür, Öğrenci İşleri
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const { id: classId } = params
    const body = await request.json()
    const { studentIds } = body

    // Validasyon
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { error: "studentIds dizisi gereklidir ve boş olmamalıdır" },
        { status: 400 }
      )
    }

    // Sınıf kontrolü
    const classData = await prisma.class.findUnique({
      where: { id: classId },
    })

    if (!classData) {
      return NextResponse.json(
        { error: "Sınıf bulunamadı" },
        { status: 404 }
      )
    }

    // Öğrencileri sınıfa ekle (toplu işlem)
    const createOperations = studentIds.map((studentId) => ({
      classId,
      studentId,
    }))

    // Duplicate kontrolü için upsert kullan
    const results = await Promise.allSettled(
      createOperations.map((data) =>
        prisma.classStudent.create({
          data,
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
        })
      )
    )

    const successful = results.filter((r) => r.status === "fulfilled")
    const failed = results.filter((r) => r.status === "rejected")

    return NextResponse.json({
      success: true,
      message: `${successful.length} öğrenci başarıyla eklendi`,
      added: successful.length,
      failed: failed.length,
      failedReasons: failed.map((r) => {
        if (r.status === "rejected" && r.reason instanceof Error) {
          return r.reason.message;
        }
        return "Bilinmeyen hata";
      }),
    })
  } catch (error) {
    console.error("Error adding students to class:", error)
    
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Bazı öğrenciler zaten bu sınıfta kayıtlı" },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Öğrenciler eklenirken bir hata oluştu" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/classes/[id]/students/[studentId]
 * Sınıftan öğrenci çıkarır
 * 
 * Yetki: Yönetici, Müdür, Öğrenci İşleri
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const { id: classId } = params
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")

    if (!studentId) {
      return NextResponse.json(
        { error: "studentId parametresi gereklidir" },
        { status: 400 }
      )
    }

    // ClassStudent kaydını bul ve sil
    const classStudent = await prisma.classStudent.findFirst({
      where: {
        classId,
        studentId,
      },
    })

    if (!classStudent) {
      return NextResponse.json(
        { error: "Öğrenci bu sınıfta kayıtlı değil" },
        { status: 404 }
      )
    }

    await prisma.classStudent.delete({
      where: { id: classStudent.id },
    })

    return NextResponse.json({
      success: true,
      message: "Öğrenci sınıftan çıkarıldı",
    })
  } catch (error) {
    console.error("Error removing student from class:", error)
    return NextResponse.json(
      { error: "Öğrenci çıkarılırken bir hata oluştu" },
      { status: 500 }
    )
  }
}

