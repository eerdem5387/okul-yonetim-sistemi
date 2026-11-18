import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { readBearerToken, verifySessionToken } from "@/lib/auth/session-token"
import { resolveStaffActor, type StaffActor } from "@/lib/hr/actor"
import {
  getEffectivePermissionKeys,
  isSuperAdmin,
  permissionKey,
  type PermissionAction,
} from "@/lib/permissions"

/**
 * API route'ları için ortak kimlik / yetki kontrolleri.
 *
 * Kurallar bilerek arayüzdeki sayfa erişimiyle aynı tutuldu (bkz. `src/app/layout.tsx`):
 * ana menüyü kullanan personel rolleri (admin, müdür, öğrenci işleri, rehberlik) yetki satırı
 * olmasa da bu sayfaları açabiliyor; öğretmenler ise yalnızca kendilerine verilen modül
 * yetkisiyle. Böylece kontroller eklenirken bugün işini yapabilen kimsenin erişimi kesilmez.
 */

export type GuardResult<T> = { ok: true; value: T } | { ok: false; response: NextResponse }

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: "Oturum bulunamadı veya süresi doldu. Lütfen tekrar giriş yapın." },
    { status: 401 }
  )
}

export function forbiddenResponse(message = "Bu işlem için yetkiniz yok."): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 })
}

/** Girişte atanan (imzalı token'daki) ana menü rolleri — layout.tsx `MAIN_SIDEBAR_STAFF_ROLES` ile aynı. */
const MAIN_MENU_STAFF_ROLES = new Set(["admin", "principal", "student_affairs", "counselor", "head_counselor"])

function loginRoleOf(request: NextRequest): string | null {
  return verifySessionToken(readBearerToken(request), "staff")?.role ?? null
}

/** Geçerli bir personel oturumu ister (aktif personel). */
export async function requireStaff(request: NextRequest): Promise<GuardResult<StaffActor>> {
  const actor = await resolveStaffActor(request)
  if (!actor) return { ok: false, response: unauthorizedResponse() }
  return { ok: true, value: actor }
}

export type PermissionRequirement = { module: string; action: PermissionAction }

/**
 * Personel oturumu + modül işlemi ister. Şunlardan biri yeterli:
 *  - sistem yöneticisi,
 *  - ana menü personel rolü (arayüzde bu sayfalar zaten bu rollere açık),
 *  - verilen gereksinimlerden herhangi birine ait etkin yetki.
 */
export async function requireStaffAccess(
  request: NextRequest,
  ...requirements: PermissionRequirement[]
): Promise<GuardResult<StaffActor>> {
  const actor = await resolveStaffActor(request)
  if (!actor) return { ok: false, response: unauthorizedResponse() }
  if (isSuperAdmin(actor.department, actor.staffId)) return { ok: true, value: actor }

  const role = loginRoleOf(request)
  if (role && MAIN_MENU_STAFF_ROLES.has(role)) return { ok: true, value: actor }

  if (requirements.length > 0) {
    const keys = new Set(await getEffectivePermissionKeys(actor.staffId, actor.department))
    if (requirements.some((r) => keys.has(permissionKey(r.module, r.action)))) {
      return { ok: true, value: actor }
    }
  }
  return { ok: false, response: forbiddenResponse() }
}

/** Yalnızca sistem yöneticisi (eski `x-user-role: admin` kontrolünün sunucu tarafı karşılığı). */
export function isSystemAdmin(actor: StaffActor): boolean {
  return isSuperAdmin(actor.department, actor.staffId)
}

export interface ParentSession {
  parentId: string
  studentIds: Set<string>
}

/** İmzalı veli token'ından aktif veli hesabını ve bağlı öğrencilerini çözer. */
export async function resolveParentSession(request: NextRequest): Promise<ParentSession | null> {
  const verified = verifySessionToken(readBearerToken(request), "parent")
  if (!verified) return null
  const parent = await prisma.parent.findUnique({
    where: { id: verified.subjectId },
    select: { id: true, isActive: true, students: { select: { studentId: true } } },
  })
  if (!parent || !parent.isActive) return null
  return { parentId: parent.id, studentIds: new Set(parent.students.map((s) => s.studentId)) }
}

/**
 * Bir öğrencinin verisini okuma: herhangi bir aktif personel veya o öğrenciye bağlı veli.
 * (Öğrenci panosu / yayınlanmış sınav sonuçları hem personel hem veli ekranlarında kullanılıyor.)
 */
export async function requireStudentReader(
  request: NextRequest,
  studentId: string
): Promise<GuardResult<{ kind: "staff"; actor: StaffActor } | { kind: "parent"; parent: ParentSession }>> {
  const token = readBearerToken(request)
  if (!token) return { ok: false, response: unauthorizedResponse() }

  const actor = await resolveStaffActor(request)
  if (actor) return { ok: true, value: { kind: "staff", actor } }

  const parent = await resolveParentSession(request)
  if (!parent) return { ok: false, response: unauthorizedResponse() }
  if (!parent.studentIds.has(studentId)) {
    return { ok: false, response: forbiddenResponse("Bu öğrencinin bilgilerine erişiminiz yok.") }
  }
  return { ok: true, value: { kind: "parent", parent } }
}
