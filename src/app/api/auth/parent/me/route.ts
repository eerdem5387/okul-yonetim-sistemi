import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { readBearerToken, verifySessionToken } from "@/lib/auth/session-token"

/**
 * GET /api/auth/parent/me
 * Veli bilgilerini döndürür
 * 
 * Headers:
 * - Authorization: Bearer <imzalı veli token'ı>
 */
export async function GET(request: NextRequest) {
  try {
    const token = readBearerToken(request)

    if (!token) {
      return NextResponse.json(
        { error: "Token bulunamadı" },
        { status: 401 }
      )
    }

    // İmza + süre (24 saat) kontrolü
    const verified = verifySessionToken(token, "parent")
    if (!verified) {
      return NextResponse.json(
        { error: "Geçersiz veya süresi dolmuş oturum. Lütfen tekrar giriş yapın." },
        { status: 401 }
      )
    }
    const parentId = verified.subjectId

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

