import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/auth/validate-session
 * Session token'ını doğrular ve kullanıcı bilgilerini döndürür
 * 
 * Query:
 * - token?: string (opsiyonel - Authorization header'dan da alınabilir)
 * 
 * Headers:
 * - Authorization?: string (Bearer token)
 * 
 * POST /api/auth/validate-session
 * Session token'ını doğrular ve kullanıcı bilgilerini döndürür
 * 
 * Body:
 * - token?: string (opsiyonel - Authorization header'dan da alınabilir)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    let token = searchParams.get("token")

    // Authorization header'dan token al (test botu için)
    if (!token) {
      const authHeader = request.headers.get("Authorization")
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7)
      }
    }

    if (!token) {
      return NextResponse.json(
        { error: "Token gereklidir (query param veya Authorization header)", valid: false },
        { status: 400 }
      )
    }

    // Token formatı: {role}_{staffId}_{timestamp}
    const tokenParts = token.split("_")
    if (tokenParts.length < 2) {
      return NextResponse.json(
        { error: "Geçersiz token formatı", valid: false },
        { status: 401 }
      )
    }

    const role = tokenParts[0]
    const staffId = tokenParts[1]
    const timestamp = tokenParts[2] || "0"

    // Token yaşını kontrol et (timestamp varsa)
    if (timestamp && timestamp !== "0") {
      const tokenAge = Date.now() - parseInt(timestamp)
      const MAX_TOKEN_AGE = 24 * 60 * 60 * 1000 // 24 saat
      
      if (tokenAge > MAX_TOKEN_AGE) {
        return NextResponse.json(
          { error: "Token süresi dolmuş", valid: false, expired: true },
          { status: 401 }
        )
      }
    }

    // Staff kaydını kontrol et
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
    })

    if (!staff) {
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı", valid: false },
        { status: 404 }
      )
    }

    if (!staff.isActive) {
      return NextResponse.json(
        { error: "Hesap devre dışı", valid: false },
        { status: 403 }
      )
    }

    return NextResponse.json({
      valid: true,
      staffId: staff.id,
      role,
      department: staff.department,
      fullName: `${staff.firstName} ${staff.lastName}`,
    })
  } catch (error) {
    console.error("Error validating session:", error)
    return NextResponse.json(
      { error: "Session doğrulaması sırasında hata oluştu", valid: false },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { error: "Token gereklidir", valid: false },
        { status: 400 }
      )
    }

    // Token formatı: {role}_{staffId}_{timestamp}
    const tokenParts = token.split("_")
    if (tokenParts.length !== 3) {
      return NextResponse.json(
        { error: "Geçersiz token formatı", valid: false },
        { status: 401 }
      )
    }

    const [role, staffId, timestamp] = tokenParts

    // Token yaşını kontrol et (24 saat)
    const tokenAge = Date.now() - parseInt(timestamp)
    const MAX_TOKEN_AGE = 24 * 60 * 60 * 1000 // 24 saat
    
    if (tokenAge > MAX_TOKEN_AGE) {
      return NextResponse.json(
        { error: "Token süresi dolmuş", valid: false, expired: true },
        { status: 401 }
      )
    }

    // Staff kaydını kontrol et
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
    })

    if (!staff) {
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı", valid: false },
        { status: 404 }
      )
    }

    if (!staff.isActive) {
      return NextResponse.json(
        { error: "Hesap devre dışı", valid: false },
        { status: 403 }
      )
    }

    return NextResponse.json({
      valid: true,
      staffId: staff.id,
      role,
      department: staff.department,
      fullName: `${staff.firstName} ${staff.lastName}`,
    })
  } catch (error) {
    console.error("Error validating session:", error)
    return NextResponse.json(
      { error: "Session doğrulaması sırasında hata oluştu", valid: false },
      { status: 500 }
    )
  }
}

