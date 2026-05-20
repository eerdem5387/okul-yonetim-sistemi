import { NextRequest, NextResponse } from "next/server"
import { resolveStaffActor } from "@/lib/hr/actor"
import { getEffectivePermissionKeys, isSuperAdmin } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 })
  }

  const permissions = await getEffectivePermissionKeys(actor.staffId, actor.department)

  return NextResponse.json({
    staffId: actor.staffId,
    department: actor.department,
    isSuperAdmin: isSuperAdmin(actor.department),
    permissions,
  })
}
