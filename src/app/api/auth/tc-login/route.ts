import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcrypt"

// Aktif roller (login yetkisi olan departmanlar)
const ACTIVE_ROLES = [
  "SUPER_ADMIN",
  "OGRETMEN",
  "REHBERLIK",
  "OGRENCI_ISLERI",
  "MUDUR",
  "MUDUR_YARDIMCISI",
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tcNumber, password } = body

    // TC Number validasyonu
    if (!tcNumber || tcNumber.length !== 11) {
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

    // Pasif personel kontrolü (Temizlik, Teknik Personel, vb.)
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
      let role: "admin" | "principal" | "teacher" | "counselor" | "student_affairs" = "teacher"
      
      if (staff.department === "SUPER_ADMIN") {
        role = "admin"
      } else if (staff.department === "MUDUR") {
        role = "principal"
      } else if (staff.department === "MUDUR_YARDIMCISI") {
        role = "student_affairs"
      } else if (staff.department === "REHBERLIK") {
        role = "counselor"
      } else if (staff.department === "OGRENCI_ISLERI") {
        role = "student_affairs"
      } else if (staff.department === "OGRETMEN") {
        role = "teacher"
      }

      // Token oluştur
      const token = `${role}_${staff.id}_${Date.now()}`
      
      // İlk giriş başarılı - kullanıcıyı şifre değiştirme ekranına yönlendir
      return NextResponse.json({
        success: true,
        isFirstLogin: true,
        mustChangePassword: true,
        token,
        role,
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
    let role: "admin" | "principal" | "teacher" | "counselor" | "student_affairs" = "teacher"
    
    if (staff.department === "SUPER_ADMIN") {
      role = "admin" // Süper Admin
    } else if (staff.department === "MUDUR") {
      role = "principal" // Müdür
    } else if (staff.department === "MUDUR_YARDIMCISI") {
      role = "student_affairs" // Müdür Yardımcısı → Öğrenci İşleri yetkisi
    } else if (staff.department === "REHBERLIK") {
      role = "counselor" // Rehberlik
    } else if (staff.department === "OGRENCI_ISLERI") {
      role = "student_affairs" // Öğrenci İşleri
    } else if (staff.department === "OGRETMEN") {
      role = "teacher" // Öğretmen
    }

    // Son giriş tarihini güncelle
    await prisma.staff.update({
      where: { id: staff.id },
      data: { lastLoginAt: new Date() },
    })

    // Token oluştur (gerçek JWT token kullanılabilir)
    const token = `${role}_${staff.id}_${Date.now()}`

    return NextResponse.json({
      success: true,
      token,
      role,
      staffId: staff.id,
      staffName: `${staff.firstName} ${staff.lastName}`,
      department: staff.department,
      isFirstLogin: false,
      mustChangePassword: staff.mustChangePassword,
    })
  } catch (error) {
    console.error("TC Login error:", error)
    return NextResponse.json(
      { error: "Giriş yapılırken bir hata oluştu!" },
      { status: 500 }
    )
  }
}

