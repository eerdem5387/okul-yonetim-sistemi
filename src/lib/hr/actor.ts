import type { NextRequest } from "next/server"
import type { StaffDepartment } from "@prisma/client"
import { readBearerToken, verifySessionToken } from "@/lib/auth/session-token"
import { prisma } from "@/lib/prisma"
import { isHrAdmin } from "./constants"

export interface StaffActor {
  staffId: string
  department: StaffDepartment
  firstName: string
  lastName: string
  isAdmin: boolean
  isTeacher: boolean
}

/** Doğrulanmış personel token'ından girişte atanan rol öneki; geçersiz token → null */
export function parseLoginRoleFromToken(token: string): string | null {
  return verifySessionToken(token, "staff")?.role ?? null
}

export function readLoginRoleFromRequest(request: NextRequest): string | null {
  const token = readBearerToken(request)
  if (!token) return null
  return parseLoginRoleFromToken(token)
}

/**
 * Bearer token'dan aktif Staff'ı çözer.
 * İmza ve süre `verifySessionToken` ile kontrol edilir; geçersiz/süresi dolmuş token için null döner.
 */
export async function resolveStaffActor(request: NextRequest): Promise<StaffActor | null> {
  const verified = verifySessionToken(readBearerToken(request), "staff")
  if (!verified) return null
  const staffId = verified.subjectId

  const staff = await prisma.staff.findUnique({ where: { id: staffId } })
  if (!staff || !staff.isActive) return null

  return {
    staffId: staff.id,
    department: staff.department,
    firstName: staff.firstName,
    lastName: staff.lastName,
    isAdmin: isHrAdmin(staff.department),
    isTeacher: staff.department === "OGRETMEN",
  }
}

/**
 * `actor` HR yöneticisi mi? Değilse `false` döner; çağıran taraf 403 yanıt verir.
 */
export function requireAdmin(actor: StaffActor | null): actor is StaffActor {
  return Boolean(actor && actor.isAdmin)
}

/**
 * `actor` belirtilen `staffId`'in sahibi mi? (Kendi kayıtlarına erişim için)
 */
export function isSelf(actor: StaffActor | null, staffId: string): boolean {
  return Boolean(actor && actor.staffId === staffId)
}
