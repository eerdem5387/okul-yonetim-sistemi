import type { NextRequest } from "next/server"
import type { StaffDepartment } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { isHrAdmin } from "./constants"

const TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000

export interface StaffActor {
  staffId: string
  department: StaffDepartment
  firstName: string
  lastName: string
  isAdmin: boolean
  isTeacher: boolean
}

function readBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization") || request.headers.get("Authorization")
  if (!header) return null
  if (header.toLowerCase().startsWith("bearer ")) return header.slice(7).trim()
  return header.trim()
}

/** Token formatı: `${role}_${staffId}_${timestamp}` → girişte atanan rol öneki */
export function parseLoginRoleFromToken(token: string): string | null {
  const parts = token.split("_")
  if (parts.length < 3) return null
  return parts.slice(0, parts.length - 2).join("_")
}

export function readLoginRoleFromRequest(request: NextRequest): string | null {
  const token = readBearerToken(request)
  if (!token) return null
  return parseLoginRoleFromToken(token)
}

/**
 * Bearer token'dan aktif Staff'ı çözer.
 * Token formatı: `${role}_${staffId}_${timestamp}` (rol "student_affairs" gibi alt çizgili olabilir → son iki parça baz alınır).
 * Geçersiz/süresi dolmuş token için null döner.
 */
export async function resolveStaffActor(request: NextRequest): Promise<StaffActor | null> {
  const token = readBearerToken(request)
  if (!token) return null

  const parts = token.split("_")
  if (parts.length < 3) return null
  if (parts[0] === "parent") return null

  const ts = Number(parts[parts.length - 1])
  const staffId = parts[parts.length - 2]
  if (!staffId || !Number.isFinite(ts)) return null
  if (Date.now() - ts > TOKEN_MAX_AGE_MS) return null

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
