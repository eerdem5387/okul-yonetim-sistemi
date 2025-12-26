import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcrypt"

/**
 * POST /api/auth/parent-login
 * Veli girişi (Öğrenci TC Kimlik No + Şifre)
 * 
 * Body:
 * - studentTcNumber: string (Öğrencinin TC Kimlik No)
 * - password: string (Şifre - İlk girişte öğrenci TC No)
 * 
 * İlk Giriş: password null ise, öğrenci TC No ile giriş yapılır
 * Sonraki Girişler: Şifre kontrolü yapılır
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { studentTcNumber, password } = body

    // Validasyon
    if (!studentTcNumber || !password) {
      return NextResponse.json(
        { error: "Öğrenci TC Kimlik No ve şifre gereklidir" },
        { status: 400 }
      )
    }

    // Önce öğrenciyi bul
    const student = await prisma.student.findUnique({
      where: { tcNumber: studentTcNumber },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        grade: true,
        tcNumber: true,
      },
    })

    if (!student) {
      return NextResponse.json(
        { error: "Öğrenci kaydı bulunamadı" },
        { status: 404 }
      )
    }

    // Veli hesabını bul (öğrenci TC bazlı)
    const parent = await prisma.parent.findUnique({
      where: { studentTcNumber },
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
              },
            },
          },
        },
      },
    })

    if (!parent) {
      return NextResponse.json(
        { error: "Veli hesabı bulunamadı" },
        { status: 404 }
      )
    }

    // Aktif kontrol
    if (!parent.isActive) {
      return NextResponse.json(
        { error: "Hesap aktif değil. Lütfen okul idaresi ile iletişime geçin." },
        { status: 403 }
      )
    }

    // Şifre kontrolü
    let isValidPassword = false

    if (!parent.password) {
      // İlk giriş: Öğrenci TC No ile giriş
      isValidPassword = password === studentTcNumber
    } else {
      // Sonraki girişler: Şifre kontrolü
      isValidPassword = await bcrypt.compare(password, parent.password)
    }

    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Öğrenci TC Kimlik No veya şifre hatalı" },
        { status: 401 }
      )
    }

    // Son giriş tarihini güncelle
    await prisma.parent.update({
      where: { id: parent.id },
      data: { lastLoginAt: new Date() },
    })

    // Token oluştur (basit token sistemi - mevcut pattern)
    const token = `parent_${parent.id}_${Date.now()}`

    // Response (Velilerin bilgileri)
    const parentsInfo = parent.students.map((ps) => ({
      name: ps.parentName,
      tcNumber: ps.parentTcNumber,
      phone: ps.parentPhone,
      email: ps.parentEmail,
      relation: ps.relation,
    }))

    // Response
    return NextResponse.json({
      success: true,
      token,
      parent: {
        id: parent.id,
        studentTcNumber: parent.studentTcNumber,
        isFirstLogin: parent.isFirstLogin,
        mustChangePassword: parent.mustChangePassword,
        parents: parentsInfo, // Anne, Baba, Vasi bilgileri
        student: student, // Öğrenci bilgisi (direkt student'tan alınıyor)
      },
    })
  } catch (error) {
    console.error("Error in parent login:", error)
    return NextResponse.json(
      { error: "Giriş işlemi sırasında bir hata oluştu" },
      { status: 500 }
    )
  }
}

