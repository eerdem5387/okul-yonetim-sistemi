import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcrypt"
import { prisma } from "@/lib/prisma"

const GENERIC = "Bu TC ile sıfırlanabilecek aktif bir hesap bulunamadı."

/**
 * Şifreyi TC kimlik numarasına sıfırlar. Girişten sonra kullanıcı yeni şifre belirler.
 * Okul uygulamasının ilk şifre kuralı budur.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const tcNumber = typeof body.tcNumber === "string" ? body.tcNumber.trim() : ""
    const kind = body.kind === "parent" ? "parent" : body.kind === "staff" ? "staff" : ""
    if (!/^\d{11}$/.test(tcNumber) || !kind) {
      return NextResponse.json(
        { error: "11 haneli TC Kimlik numarası girin." },
        { status: 400 }
      )
    }

    const hashed = await bcrypt.hash(tcNumber, 10)

    if (kind === "parent") {
      const parent = await prisma.parent.findUnique({ where: { studentTcNumber: tcNumber } })
      if (!parent || !parent.isActive) {
        return NextResponse.json({ error: GENERIC }, { status: 404 })
      }
      await prisma.parent.update({
        where: { id: parent.id },
        data: { password: hashed, mustChangePassword: true, isFirstLogin: false },
      })
    } else {
      const staff = await prisma.staff.findUnique({ where: { tcNumber } })
      if (!staff || !staff.isActive) {
        return NextResponse.json({ error: GENERIC }, { status: 404 })
      }
      await prisma.staff.update({
        where: { id: staff.id },
        data: { password: hashed, mustChangePassword: true, isFirstLogin: false },
      })
    }

    return NextResponse.json({
      success: true,
      message:
        "Şifreniz TC Kimlik numaranıza sıfırlandı. Bu şifreyle giriş yapın, ardından Hesap bölümünden yeni bir şifre belirleyin.",
    })
  } catch (error) {
    console.error("forgot-password", error)
    return NextResponse.json(
      { error: "Şifre sıfırlanamadı. Biraz sonra tekrar deneyin." },
      { status: 500 }
    )
  }
}
