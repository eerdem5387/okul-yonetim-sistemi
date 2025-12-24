import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcrypt"

/**
 * POST /api/auth/change-password
 * Şifre değiştirme endpoint'i
 * 
 * Body:
 * - staffId?: string (staffId veya tcNumber biri zorunlu)
 * - tcNumber?: string (staffId veya tcNumber biri zorunlu)
 * - oldPassword?: string (ilk giriş dışında zorunlu)
 * - newPassword: string (zorunlu)
 * - isFirstLogin?: boolean (ilk giriş mi?)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { staffId, tcNumber, oldPassword, newPassword, isFirstLogin } = body

    // Validasyon
    if ((!staffId && !tcNumber) || !newPassword) {
      return NextResponse.json(
        { error: "staffId veya tcNumber ve newPassword zorunludur" },
        { status: 400 }
      )
    }

    // Yeni şifre uzunluk kontrolü
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Yeni şifre en az 6 karakter olmalıdır" },
        { status: 400 }
      )
    }

    // Staff kaydını bul (staffId veya tcNumber ile)
    const staff = await prisma.staff.findUnique({
      where: staffId ? { id: staffId } : { tcNumber },
    })

    if (!staff) {
      return NextResponse.json({ error: "Personel bulunamadı" }, { status: 404 })
    }

    // İlk giriş değilse, eski şifre kontrolü yap
    if (!isFirstLogin && staff.password) {
      if (!oldPassword) {
        return NextResponse.json(
          { error: "Eski şifre gereklidir" },
          { status: 400 }
        )
      }

      const isOldPasswordValid = await bcrypt.compare(oldPassword, staff.password)
      if (!isOldPasswordValid) {
        return NextResponse.json(
          { error: "Eski şifre hatalı" },
          { status: 401 }
        )
      }
    }

    // Yeni şifreyi hash'le
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Staff kaydını güncelle
    const updatedStaff = await prisma.staff.update({
      where: { id: staff.id },
      data: {
        password: hashedPassword,
        isFirstLogin: false,
        mustChangePassword: false,
        lastLoginAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: "Şifre başarıyla değiştirildi",
      staff: {
        id: updatedStaff.id,
        firstName: updatedStaff.firstName,
        lastName: updatedStaff.lastName,
        department: updatedStaff.department,
        isFirstLogin: updatedStaff.isFirstLogin,
      },
    })
  } catch (error) {
    console.error("Error changing password:", error)
    return NextResponse.json(
      { error: "Şifre değiştirilirken bir hata oluştu" },
      { status: 500 }
    )
  }
}

