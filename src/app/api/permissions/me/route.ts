import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { readLoginRoleFromRequest, resolveStaffActor } from "@/lib/hr/actor"
import { getEffectivePermissionKeys, isSuperAdmin } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 })
  }

  const loginRole = readLoginRoleFromRequest(request)
  const permissions = await getEffectivePermissionKeys(actor.staffId, actor.department)

  const staff = await prisma.staff.findUnique({
    where: { id: actor.staffId },
    select: {
      firstName: true,
      lastName: true,
      subject: true,
      hasGeziAccess: true,
      hasIbAccess: true,
      isActive: true,
    },
  })

  return NextResponse.json({
    staffId: actor.staffId,
    department: actor.department,
    loginRole,
    isSuperAdmin: isSuperAdmin(actor.department, actor.staffId),
    permissions,
    firstName: staff?.firstName ?? actor.firstName,
    lastName: staff?.lastName ?? actor.lastName,
    fullName: `${staff?.firstName ?? actor.firstName} ${staff?.lastName ?? actor.lastName}`.trim(),
    subject: staff?.subject ?? null,
    hasGeziAccess: staff?.hasGeziAccess ?? false,
    hasIbAccess: staff?.hasIbAccess ?? false,
    isActive: staff?.isActive ?? true,
  })
}
