import { NextRequest } from "next/server"
import { resolveStaffActor } from "@/lib/hr/actor"
import { readBearerToken, verifySessionToken } from "@/lib/auth/session-token"
import { hasPermission } from "@/lib/permissions"

async function resolveStaffIdFromRequest(request: NextRequest): Promise<string | null> {
  const actor = await resolveStaffActor(request)
  if (actor) return actor.staffId

  const verified = verifySessionToken(readBearerToken(request), "staff")
  if (verified) return verified.subjectId

  const { searchParams } = new URL(request.url)
  return searchParams.get("staffId")
}

/**
 * Faaliyet Yönetimi erişim kontrolü
 */
export async function checkActivityAccess(
  request: NextRequest
): Promise<{ hasAccess: boolean; staffId: string | null }> {
  try {
    const actor = await resolveStaffActor(request)
    if (actor) {
      const ok = await hasPermission(actor.staffId, actor.department, "activity_events", "view")
      return { hasAccess: ok, staffId: actor.staffId }
    }

    const staffId = await resolveStaffIdFromRequest(request)
    if (!staffId) return { hasAccess: false, staffId: null }

    return { hasAccess: false, staffId }
  } catch {
    return { hasAccess: false, staffId: null }
  }
}

/**
 * Personel faaliyet istatistikleri (hangi öğretmen kaç faaliyet girdi) — ayrı izin gerekir.
 * Faaliyet yönetimi görüntüleme yetkisi tek başına yeterli değildir.
 */
export async function checkActivityStaffStatsAccess(
  request: NextRequest
): Promise<{ hasAccess: boolean; staffId: string | null }> {
  try {
    const actor = await resolveStaffActor(request)
    if (actor) {
      const ok = await hasPermission(
        actor.staffId,
        actor.department,
        "activity_staff_stats",
        "view"
      )
      return { hasAccess: ok, staffId: actor.staffId }
    }
    return { hasAccess: false, staffId: null }
  } catch {
    return { hasAccess: false, staffId: null }
  }
}

/**
 * Gezi Yönetimi erişim kontrolü
 */
export async function checkGeziAccess(
  request: NextRequest
): Promise<{ hasAccess: boolean; staffId: string | null }> {
  try {
    const actor = await resolveStaffActor(request)
    if (actor) {
      const ok = await hasPermission(actor.staffId, actor.department, "gezi", "view")
      return { hasAccess: ok, staffId: actor.staffId }
    }
    return { hasAccess: false, staffId: null }
  } catch (error) {
    console.error("Error checking gezi access:", error)
    return { hasAccess: false, staffId: null }
  }
}
