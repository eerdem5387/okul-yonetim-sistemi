import { NextRequest, NextResponse } from "next/server"
import { readLoginRoleFromRequest, resolveStaffActor } from "@/lib/hr/actor"
import { getEffectivePermissionKeys, isSuperAdminSession } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 })
  }

  const loginRole = readLoginRoleFromRequest(request)
  const permissions = await getEffectivePermissionKeys(actor.staffId, actor.department)
  const superAdmin = isSuperAdminSession(actor.department, loginRole)

  return NextResponse.json({
    staffId: actor.staffId,
    department: actor.department,
    loginRole,
    isSuperAdmin: superAdmin,
    permissions,
  })
}
