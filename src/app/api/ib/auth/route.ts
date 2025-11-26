import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcrypt"

// POST - IB Viewer login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json({ error: "Kullanıcı adı ve şifre gereklidir" }, { status: 400 })
    }

    // IB Viewer'ı bul
    const viewer = await prisma.iBViewer.findUnique({
      where: { username },
    })

    if (!viewer) {
      return NextResponse.json({ error: "Kullanıcı adı veya şifre hatalı" }, { status: 401 })
    }

    // Aktif mi kontrol et
    if (!viewer.isActive) {
      return NextResponse.json({ error: "Bu hesap devre dışı bırakılmış" }, { status: 403 })
    }

    // Şifre kontrolü
    const isValidPassword = await bcrypt.compare(password, viewer.password)

    if (!isValidPassword) {
      return NextResponse.json({ error: "Kullanıcı adı veya şifre hatalı" }, { status: 401 })
    }

    // Son giriş tarihini güncelle
    await prisma.iBViewer.update({
      where: { id: viewer.id },
      data: { lastLoginAt: new Date() },
    })

    // Güvenli token oluştur (basit bir yaklaşım - production'da JWT kullanılmalı)
    const token = `ib_viewer_${viewer.id}_${Date.now()}`

    // Şifreyi döndürme
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...safeViewer } = viewer

    return NextResponse.json({
      success: true,
      token,
      viewer: safeViewer,
    })
  } catch (error) {
    console.error("IB Viewer login error:", error)
    return NextResponse.json({ error: "Giriş yapılırken bir hata oluştu" }, { status: 500 })
  }
}

