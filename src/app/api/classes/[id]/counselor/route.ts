import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * PUT /api/classes/[id]/counselor
 * Sınıfa rehberlik uzmanı atar veya değiştirir
 * 
 * Body:
 * - counselorId: string | null - Rehberlik uzmanı ID (null ise mevcut atamayı kaldırır)
 * 
 * Yetki: Yönetici, Müdür, Öğrenci İşleri
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const { id: classId } = params
    const body = await request.json()
    const { counselorId } = body

    // Sınıf kontrolü
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        counselor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
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

    // Counselor kontrolü (eğer atanacaksa)
    if (counselorId) {
      const counselor = await prisma.staff.findUnique({
        where: { id: counselorId },
      })

      if (!counselor) {
        return NextResponse.json(
          { error: "Personel bulunamadı" },
          { status: 404 }
        )
      }

      if (counselor.department !== "REHBERLIK") {
        return NextResponse.json(
          { error: "Sadece rehberlik departmanından personel atanabilir" },
          { status: 400 }
        )
      }

      if (!counselor.isActive) {
        return NextResponse.json(
          { error: "Bu personel aktif değil" },
          { status: 400 }
        )
      }
    }

    // Sınıfı güncelle
    const updatedClass = await prisma.class.update({
      where: { id: classId },
      data: { counselorId },
      include: {
        counselor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: counselorId
        ? "Rehberlik uzmanı başarıyla atandı"
        : "Rehberlik uzmanı ataması kaldırıldı",
      class: updatedClass,
    })
  } catch (error) {
    console.error("Error assigning counselor:", error)
    return NextResponse.json(
      { error: "Rehberlik uzmanı atanırken bir hata oluştu" },
      { status: 500 }
    )
  }
}

