import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/auth/parent/me
 * Veli bilgilerini döndürür
 * 
 * Headers:
 * - Authorization: Bearer parent_{parentId}_{timestamp}
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.replace("Bearer ", "")

    if (!token) {
      return NextResponse.json(
        { error: "Token bulunamadı" },
        { status: 401 }
      )
    }

    // Token parse et (format: parent_{parentId}_{timestamp})
    const [prefix, parentId, timestamp] = token.split("_")

    if (prefix !== "parent" || !parentId) {
      return NextResponse.json(
        { error: "Geçersiz token" },
        { status: 401 }
      )
    }

    // Token yaşı kontrolü (24 saat)
    const tokenAge = Date.now() - parseInt(timestamp)
    const twentyFourHours = 24 * 60 * 60 * 1000

    if (tokenAge > twentyFourHours) {
      return NextResponse.json(
        { error: "Token süresi dolmuş. Lütfen tekrar giriş yapın." },
        { status: 401 }
      )
    }

    // Veli hesabını getir
    const parent = await prisma.parent.findUnique({
      where: { id: parentId },
      include: {
        students: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                grade: true,
                tcNumber: true,
                birthDate: true,
                phone: true,
                email: true,
              },
            },
          },
        },
      },
    })

    if (!parent || !parent.isActive) {
      return NextResponse.json(
        { error: "Hesap bulunamadı veya aktif değil" },
        { status: 404 }
      )
    }

    // Velilerin bilgileri
    const parentsInfo = parent.students.map((ps) => ({
      name: ps.parentName,
      tcNumber: ps.parentTcNumber,
      phone: ps.parentPhone,
      email: ps.parentEmail,
      relation: ps.relation,
    }))

    // Response
    return NextResponse.json({
      parent: {
        id: parent.id,
        studentTcNumber: parent.studentTcNumber,
        isFirstLogin: parent.isFirstLogin,
        mustChangePassword: parent.mustChangePassword,
        parents: parentsInfo, // Anne, Baba, Vasi bilgileri
        student: parent.students[0]?.student || null, // Öğrenci bilgisi
      },
    })
  } catch (error) {
    console.error("Error fetching parent info:", error)
    return NextResponse.json(
      { error: "Veli bilgileri alınırken bir hata oluştu" },
      { status: 500 }
    )
  }
}

