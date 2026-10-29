import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcrypt"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { isStaffTokenExpired, parseStaffToken } from "@/lib/auth/token"

/**
 * Giriş yapmış kullanıcının kendi hesabını kapatır.
 * Öğrenci, personel ve okul kayıtları silinmez; yalnızca giriş kapanır.
 */
export async function POST(request: NextRequest) {
  try {
    const header = request.headers.get("authorization") ?? ""
    const token = header.match(/^Bearer\s+(.+)$/i)?.[1]
    if (!token) {
      return NextResponse.json({ error: "Oturumunuz sona erdi. Tekrar giriş yapın." }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const password = typeof body.password === "string" ? body.password : ""
    if (!password) {
      return NextResponse.json({ error: "Hesabı kapatmak için şifrenizi girin." }, { status: 400 })
    }

    const lockedPassword = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10)

    if (token.startsWith("parent_")) {
      const parts = token.split("_")
      const parentId = parts[1]
      if (!parentId) {
        return NextResponse.json({ error: "Oturum doğrulanamadı. Tekrar giriş yapın." }, { status: 401 })
      }
      const parent = await prisma.parent.findUnique({ where: { id: parentId } })
      if (!parent || !parent.isActive) {
        return NextResponse.json({ error: "Hesap bulunamadı veya zaten kapalı." }, { status: 404 })
      }
      const matches = parent.password
        ? await bcrypt.compare(password, parent.password)
        : password === parent.studentTcNumber
      if (!matches) {
        return NextResponse.json({ error: "Şifre hatalı. Hesap kapatılmadı." }, { status: 401 })
      }
      await prisma.parent.update({
        where: { id: parent.id },
        data: { isActive: false, password: lockedPassword, mustChangePassword: false },
      })
      return NextResponse.json({
        success: true,
        message: "Hesabınız kapatıldı. Öğrenci kayıtları okulda durur; bu hesapla giriş yapılamaz.",
      })
    }

    if (isStaffTokenExpired(token)) {
      return NextResponse.json({ error: "Oturumunuz sona erdi. Tekrar giriş yapın." }, { status: 401 })
    }
    const parsed = parseStaffToken(token)
    if (!parsed) {
      return NextResponse.json({ error: "Oturum doğrulanamadı. Tekrar giriş yapın." }, { status: 401 })
    }
    const staff = await prisma.staff.findUnique({ where: { id: parsed.staffId } })
    if (!staff || !staff.isActive) {
      return NextResponse.json({ error: "Hesap bulunamadı veya zaten kapalı." }, { status: 404 })
    }
    const matches = staff.password
      ? await bcrypt.compare(password, staff.password)
      : password === staff.tcNumber
    if (!matches) {
      return NextResponse.json({ error: "Şifre hatalı. Hesap kapatılmadı." }, { status: 401 })
    }
    await prisma.staff.update({
      where: { id: staff.id },
      data: { isActive: false, password: lockedPassword, mustChangePassword: false },
    })
    return NextResponse.json({
      success: true,
      message: "Hesabınız kapatıldı. Okul kayıtları durur; bu hesapla giriş yapılamaz.",
    })
  } catch (error) {
    console.error("delete-account", error)
    return NextResponse.json(
      { error: "Hesap kapatılırken bir sorun oluştu. Tekrar deneyin." },
      { status: 500 }
    )
  }
}
