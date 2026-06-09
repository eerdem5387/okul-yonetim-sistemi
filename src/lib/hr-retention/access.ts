import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { resolveStaffActor } from "@/lib/hr/actor"
import { resolveActorWithPermission } from "@/lib/permissions"
import type { PermissionAction } from "@/lib/permissions/constants"

export const HR_RETENTION_MODULE = "hr_retention" as const

export async function requireHrRetentionAccess(
  request: NextRequest,
  action: PermissionAction
) {
  const actor = await resolveStaffActor(request)
  if (!actor) {
    return {
      actor: null,
      response: NextResponse.json({ error: "Yetkisiz" }, { status: 401 }),
    }
  }

  if (actor.isAdmin) {
    return { actor, response: null }
  }

  const permitted = await resolveActorWithPermission(request, HR_RETENTION_MODULE, action)
  if (!permitted) {
    return {
      actor: null,
      response: NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 }),
    }
  }

  return { actor: permitted, response: null }
}
