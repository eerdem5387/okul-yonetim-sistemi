import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcrypt"

// Aktif roller (login yetkisi olan departmanlar)
const ACTIVE_ROLES = [
  "SUPER_ADMIN",
  "OGRETMEN",
  "REHBERLIK",
  "BAS_REHBERLIK",
  "OGRENCI_ISLERI",
  "MUDUR",
  "MUDUR_YARDIMCISI",
  "KURUCU",
]

/**
 * POST /api/auth/login
 * Staff login endpoint - supports both username/password (legacy) and tcNumber/password
 * 
 * Body:
 * - username?: string (for legacy support - only for student_affairs)
 * - tcNumber?: string (TC Kimlik numarası - 11 haneli)
 * - password: string (zorunlu)
 * - role?: string (opsiyonel - legacy support için)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, tcNumber, password, role } = body

    // Legacy support: username/password ile giriş (student_affairs için)
    if (username && !tcNumber && role === "student_affairs") {
      const STUDENT_AFFAIRS_USERNAME = process.env.STUDENT_AFFAIRS_USERNAME || "leventyonetim"
      const STUDENT_AFFAIRS_PASSWORD = process.env.STUDENT_AFFAIRS_PASSWORD || "QAZWSX90"
      
      if (username === STUDENT_AFFAIRS_USERNAME && password === STUDENT_AFFAIRS_PASSWORD) {
        return NextResponse.json({
          success: true,
          token: "student_affairs_token_" + Date.now(),
          role: "student_affairs"
        })
      } else {
        return NextResponse.json(
          { error: "Kullanıcı adı veya şifre hatalı!" },
          { status: 401 }
        )
      }
    }

    // Modern approach: TC Number ile giriş
    if (!tcNumber) {
      return NextResponse.json(
        { error: "TC Kimlik numarası gereklidir" },
        { status: 400 }
      )
    }

    // TC Number validasyonu
    if (tcNumber.length !== 11) {
      return NextResponse.json(
        { error: "Geçerli bir TC Kimlik numarası giriniz (11 haneli)" },
        { status: 400 }
      )
    }

    // Staff'ı TC Kimlik numarası ile bul
    const staff = await prisma.staff.findUnique({
      where: { tcNumber },
    })

    if (!staff) {
      return NextResponse.json(
        { error: "TC Kimlik numarası bulunamadı!" },
        { status: 404 }
      )
    }

    // Aktif hesap kontrolü
    if (!staff.isActive) {
      return NextResponse.json(
        { error: "Bu hesap devre dışı bırakılmış!" },
        { status: 403 }
      )
    }

    // Pasif personel kontrolü
    if (!ACTIVE_ROLES.includes(staff.department)) {
      return NextResponse.json(
        { error: "Bu hesap giriş yetkisine sahip değil!" },
        { status: 403 }
      )
    }

    // İlk giriş kontrolü - password null ise TC ile giriş yapabilir
    if (!staff.password) {
      // İlk giriş - TC No ile giriş (password henüz set edilmemiş)
      if (!password || password !== tcNumber) {
        return NextResponse.json(
          { error: "İlk girişinizde şifreniz TC Kimlik numaranızdır" },
          { status: 401 }
        )
      }
      
      // Rol belirleme (ilk giriş için de)
      let userRole: "admin" | "principal" | "teacher" | "counselor" | "student_affairs" = "teacher"
      
      if (staff.department === "SUPER_ADMIN") {
        userRole = "admin"
      } else if (staff.department === "MUDUR" || staff.department === "KURUCU") {
        userRole = "principal"
      } else if (staff.department === "MUDUR_YARDIMCISI") {
        userRole = "student_affairs"
      } else if (staff.department === "REHBERLIK") {
        userRole = "counselor"
      } else if (staff.department === "OGRENCI_ISLERI") {
        userRole = "student_affairs"
      } else if (staff.department === "OGRETMEN") {
        userRole = "teacher"
      }

      // Token oluştur
      const token = `${userRole}_${staff.id}_${Date.now()}`
      
      // İlk giriş başarılı
      return NextResponse.json({
        success: true,
        isFirstLogin: true,
        mustChangePassword: true,
        token,
        role: userRole,
        staffId: staff.id,
        staffName: `${staff.firstName} ${staff.lastName}`,
        department: staff.department,
        message: "İlk girişiniz. Lütfen şifrenizi değiştirin.",
      })
    }

    // Normal giriş - password kontrolü
    if (!password) {
      return NextResponse.json(
        { error: "Şifre gereklidir" },
        { status: 400 }
      )
    }

    const isPasswordValid = await bcrypt.compare(password, staff.password)
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Şifre hatalı!" },
        { status: 401 }
      )
    }

    // Rol belirleme
    let userRole: "admin" | "principal" | "teacher" | "counselor" | "head_counselor" | "student_affairs" = "teacher"
    
    if (staff.department === "SUPER_ADMIN") {
      userRole = "admin"
    } else if (staff.department === "MUDUR" || staff.department === "KURUCU") {
      userRole = "principal"
    } else if (staff.department === "MUDUR_YARDIMCISI") {
      userRole = "student_affairs"
    } else if (staff.department === "BAS_REHBERLIK") {
      userRole = "head_counselor"
    } else if (staff.department === "REHBERLIK") {
      userRole = "counselor"
    } else if (staff.department === "OGRENCI_ISLERI") {
      userRole = "student_affairs"
    } else if (staff.department === "OGRETMEN") {
      userRole = "teacher"
    }

    // Son giriş tarihini güncelle
    await prisma.staff.update({
      where: { id: staff.id },
      data: { lastLoginAt: new Date() },
    })

    // Token oluştur
    const token = `${userRole}_${staff.id}_${Date.now()}`

    return NextResponse.json({
      success: true,
      token,
      role: userRole,
      staffId: staff.id,
      staffName: `${staff.firstName} ${staff.lastName}`,
      department: staff.department,
      isFirstLogin: false,
      mustChangePassword: staff.mustChangePassword,
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { error: "Giriş yapılırken bir hata oluştu!" },
      { status: 500 }
    )
  }
}

