import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * Faaliyet Yönetimi erişim kontrolü (yeni modül)
 */
export async function checkActivityAccess(request: NextRequest): Promise<{ hasAccess: boolean; staffId: string | null }> {
  try {
    const authHeader = request.headers.get("Authorization")
    let staffId: string | null = null

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      const tokenParts = token.split("_")
      if (tokenParts.length >= 2) {
        staffId = tokenParts[1]
      }
    }

    if (!staffId) {
      const { searchParams } = new URL(request.url)
      staffId = searchParams.get("staffId")
    }

    if (!staffId) {
      return { hasAccess: false, staffId: null }
    }

    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: { id: true, department: true, hasIbAccess: true, isActive: true },
    })

    if (!staff || !staff.isActive) {
      return { hasAccess: false, staffId }
    }

    if (
      staff.department === "SUPER_ADMIN" ||
      staff.department === "MUDUR" ||
      staff.department === "MUDUR_YARDIMCISI" ||
      staff.department === "OGRENCI_ISLERI" ||
      staff.department === "REHBERLIK" ||
      staff.department === "BAS_REHBERLIK"
    ) {
      return { hasAccess: true, staffId }
    }

    if (staff.department === "OGRETMEN") {
      return { hasAccess: staff.hasIbAccess === true, staffId }
    }

    return { hasAccess: false, staffId }
  } catch {
    return { hasAccess: false, staffId: null }
  }
}

/**
 * Gezi Yönetimi erişim kontrolü
 * @param request NextRequest
 * @returns { hasAccess: boolean, staffId: string | null }
 */
export async function checkGeziAccess(request: NextRequest): Promise<{ hasAccess: boolean; staffId: string | null }> {
  try {
    // Authorization header'dan staffId'yi çıkar
    const authHeader = request.headers.get("Authorization")
    let staffId: string | null = null
    
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      const tokenParts = token.split("_")
      if (tokenParts.length >= 2) {
        staffId = tokenParts[1]
      }
    }
    
    // Query parametresinden de alınabilir
    if (!staffId) {
      const { searchParams } = new URL(request.url)
      staffId = searchParams.get("staffId")
    }
    
    if (!staffId) {
      return { hasAccess: false, staffId: null }
    }
    
    // Staff bilgilerini çek
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: {
        id: true,
        department: true,
        hasGeziAccess: true,
        isActive: true,
      },
    })
    
    if (!staff || !staff.isActive) {
      return { hasAccess: false, staffId }
    }
    
    // Admin, principal, student_affairs, counselor, head_counselor için varsayılan erişim
    if (
      staff.department === "SUPER_ADMIN" ||
      staff.department === "MUDUR" ||
      staff.department === "MUDUR_YARDIMCISI" ||
      staff.department === "OGRENCI_ISLERI" ||
      staff.department === "REHBERLIK" ||
      staff.department === "BAS_REHBERLIK"
    ) {
      return { hasAccess: true, staffId }
    }
    
    // Teacher için hasGeziAccess kontrolü
    if (staff.department === "OGRETMEN") {
      return { hasAccess: staff.hasGeziAccess === true, staffId }
    }
    
    return { hasAccess: false, staffId }
  } catch (error) {
    console.error("Error checking gezi access:", error)
    return { hasAccess: false, staffId: null }
  }
}

/**
 * IB Yönetimi erişim kontrolü
 * @param request NextRequest
 * @returns { hasAccess: boolean, staffId: string | null }
 */
export async function checkIbAccess(request: NextRequest): Promise<{ hasAccess: boolean; staffId: string | null }> {
  try {
    // Authorization header'dan staffId'yi çıkar
    const authHeader = request.headers.get("Authorization")
    let staffId: string | null = null
    
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      const tokenParts = token.split("_")
      if (tokenParts.length >= 2) {
        staffId = tokenParts[1]
      }
    }
    
    // Query parametresinden de alınabilir
    if (!staffId) {
      const { searchParams } = new URL(request.url)
      staffId = searchParams.get("staffId")
    }
    
    if (!staffId) {
      return { hasAccess: false, staffId: null }
    }
    
    // Staff bilgilerini çek
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: {
        id: true,
        department: true,
        hasIbAccess: true,
        isActive: true,
      },
    })
    
    if (!staff || !staff.isActive) {
      return { hasAccess: false, staffId }
    }
    
    // Admin, principal, student_affairs, counselor, head_counselor için varsayılan erişim
    if (
      staff.department === "SUPER_ADMIN" ||
      staff.department === "MUDUR" ||
      staff.department === "MUDUR_YARDIMCISI" ||
      staff.department === "OGRENCI_ISLERI" ||
      staff.department === "REHBERLIK" ||
      staff.department === "BAS_REHBERLIK"
    ) {
      return { hasAccess: true, staffId }
    }
    
    // Teacher için hasIbAccess kontrolü
    if (staff.department === "OGRETMEN") {
      return { hasAccess: staff.hasIbAccess === true, staffId }
    }
    
    return { hasAccess: false, staffId }
  } catch (error) {
    console.error("Error checking IB access:", error)
    return { hasAccess: false, staffId: null }
  }
}

