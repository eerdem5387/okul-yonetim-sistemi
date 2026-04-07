import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isStaffEligibleAsClassCounselor } from "@/lib/staff-counseling"
import { Prisma } from "@prisma/client"

/**
 * GET /api/classes/[id]
 * Sınıf detaylarını döndürür
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const { id } = params

    const classData = await prisma.class.findUnique({
      where: { id },
      include: {
        academicYear: true,
        counselor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            department: true,
          },
        },
        students: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                tcNumber: true,
                grade: true,
                email: true,
                phone: true,
              },
            },
          },
          orderBy: {
            student: {
              lastName: "asc",
            },
          },
        },
        schedules: {
          include: {
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                department: true,
                subject: true,
              },
            },
          },
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        },
        subjects: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    })

    if (!classData) {
      return NextResponse.json(
        { error: "Sınıf bulunamadı" },
        { status: 404 }
      )
    }

    return NextResponse.json({ class: classData })
  } catch (error) {
    console.error("Error fetching class:", error)
    return NextResponse.json(
      { error: "Sınıf bilgileri yüklenirken bir hata oluştu" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/classes/[id]
 * Sınıf bilgilerini günceller
 * 
 * Body:
 * - name?: string
 * - grade?: number
 * - section?: string
 * - counselorId?: string | null
 * - description?: string
 * 
 * Yetki: Yönetici, Müdür, Öğrenci İşleri
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const { id } = params
    const body = await request.json()
    const { name, grade, section, counselorId, description } = body

    // Sınıf kontrolü
    const existingClass = await prisma.class.findUnique({
      where: { id },
    })

    if (!existingClass) {
      return NextResponse.json(
        { error: "Sınıf bulunamadı" },
        { status: 404 }
      )
    }

    // Counselor kontrolü (eğer değiştiriliyorsa)
    if (counselorId && counselorId !== existingClass.counselorId) {
      const counselor = await prisma.staff.findUnique({
        where: { id: counselorId },
      })

      if (!counselor || !isStaffEligibleAsClassCounselor(counselor.department)) {
        return NextResponse.json(
          { error: "Geçersiz rehberlik uzmanı" },
          { status: 400 }
        )
      }
    }

    // Güncelleme
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (grade !== undefined) {
      if (grade < 5 || grade > 12) {
        return NextResponse.json(
          { error: "Sınıf seviyesi 5-12 arasında olmalıdır" },
          { status: 400 }
        )
      }
      updateData.grade = grade
    }
    if (section !== undefined) updateData.section = section
    if (counselorId !== undefined) updateData.counselorId = counselorId
    if (description !== undefined) updateData.description = description

    const updatedClass = await prisma.class.update({
      where: { id },
      data: updateData,
      include: {
        academicYear: true,
        counselor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        _count: {
          select: {
            students: true,
            schedules: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: "Sınıf başarıyla güncellendi",
      class: updatedClass,
    })
  } catch (error) {
    console.error("Error updating class:", error)
    
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Bu akademik yılda bu isimde bir sınıf zaten mevcut" },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Sınıf güncellenirken bir hata oluştu" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/classes/[id]
 * Sınıfı siler
 * 
 * Yetki: Sadece Yönetici ve Müdür
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const { id } = params

    // Sınıf kontrolü
    const existingClass = await prisma.class.findUnique({
      where: { id },
    })

    if (!existingClass) {
      return NextResponse.json(
        { error: "Sınıf bulunamadı" },
        { status: 404 }
      )
    }

    // classId ile bağlı onay kayıtları (FK yok); sınıf silmeden temizlenmeli
    await prisma.$transaction(async (tx) => {
      await tx.scheduleApproval.deleteMany({ where: { classId: id } })
      await tx.class.delete({ where: { id } })
    })

    return NextResponse.json({
      success: true,
      message: "Sınıf başarıyla silindi",
    })
  } catch (error) {
    console.error("Error deleting class:", error)
    return NextResponse.json(
      { error: "Sınıf silinirken bir hata oluştu" },
      { status: 500 }
    )
  }
}

