import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcrypt"

/**
 * POST /api/auth/parent-change-password
 * Veli şifre değiştirme
 * 
 * Body:
 * - parentId: string (Veli ID)
 * - oldPassword?: string (Eski şifre - ilk giriş hariç)
 * - newPassword: string (Yeni şifre)
 * - isFirstLogin?: boolean (İlk giriş mi?)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { parentId, oldPassword, newPassword, isFirstLogin } = body

    // Validasyon
    if (!parentId || !newPassword) {
      return NextResponse.json(
        { error: "Veli ID ve yeni şifre gereklidir" },
        { status: 400 }
      )
    }

    // Minimum şifre uzunluğu kontrolü
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Şifre en az 6 karakter olmalıdır" },
        { status: 400 }
      )
    }

    // Veli kaydını bul
    const parent = await prisma.parent.findUnique({
      where: { id: parentId },
    })

    if (!parent) {
      return NextResponse.json(
        { error: "Veli bulunamadı" },
        { status: 404 }
      )
    }

    // İlk giriş değilse, eski şifre kontrolü yap
    if (!isFirstLogin && parent.password) {
      if (!oldPassword) {
        return NextResponse.json(
          { error: "Eski şifre gereklidir" },
          { status: 400 }
        )
      }

      const isOldPasswordValid = await bcrypt.compare(oldPassword, parent.password)
      if (!isOldPasswordValid) {
        return NextResponse.json(
          { error: "Eski şifre hatalı" },
          { status: 401 }
        )
      }
    }

    // Yeni şifreyi hash'le
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Veli kaydını güncelle
    await prisma.parent.update({
      where: { id: parentId },
      data: {
        password: hashedPassword,
        isFirstLogin: false,
        mustChangePassword: false,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Şifreniz başarıyla değiştirildi",
    })
  } catch (error) {
    console.error("Error changing parent password:", error)
    return NextResponse.json(
      { error: "Şifre değiştirilirken bir hata oluştu" },
      { status: 500 }
    )
  }
}

