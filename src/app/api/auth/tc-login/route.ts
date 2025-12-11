import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tcNumber } = body

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

    if (!staff.isActive) {
      return NextResponse.json(
        { error: "Bu hesap devre dışı bırakılmış!" },
        { status: 403 }
      )
    }

    // Rol belirleme
    let role: "teacher" | "counselor" | "student_affairs" = "teacher"
    
    if (staff.department === "REHBERLIK") {
      role = "counselor"
    } else if (staff.department === "OGRENCI_ISLERI" || staff.department === "MUDUR" || staff.department === "MUDUR_YARDIMCISI") {
      role = "student_affairs"
    } else if (staff.department === "OGRETMEN") {
      role = "teacher"
    }

    // Token oluştur
    const token = `${role}_${staff.id}_${Date.now()}`

    return NextResponse.json({
      success: true,
      token,
      role,
      staffId: staff.id,
      staffName: `${staff.firstName} ${staff.lastName}`,
      department: staff.department,
    })
  } catch (error) {
    console.error("TC Login error:", error)
    return NextResponse.json(
      { error: "Giriş yapılırken bir hata oluştu!" },
      { status: 500 }
    )
  }
}

