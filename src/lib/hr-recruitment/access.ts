import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { resolveStaffActor } from "@/lib/hr/actor"
import { resolveActorWithPermission } from "@/lib/permissions"
import type { PermissionAction } from "@/lib/permissions/constants"

export const HR_RECRUITMENT_MODULE = "hr_recruitment" as const

export async function requireHrRecruitmentAccess(
  request: NextRequest,
  action: PermissionAction
) {
  const actor = await resolveActorWithPermission(request, HR_RECRUITMENT_MODULE, action)
  if (!actor) {
    return {
      actor: null,
      response: NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 }),
    }
  }
  return { actor, response: null }
}
