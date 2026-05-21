import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSuperAdmin } from "@/lib/permissions"
import { buildPermissionMatrix } from "@/lib/permissions/matrix"
import { permissionKey } from "@/lib/permissions/constants"
import { replaceStaffPermissions } from "@/lib/permissions/persist"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await requireSuperAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 })
  }

  const { id } = await context.params
  const staff = await prisma.staff.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      department: true,
      hasGeziAccess: true,
      hasIbAccess: true,
      permissions: { select: { module: true, action: true, granted: true } },
    },
  })

  if (!staff) {
    return NextResponse.json({ error: "Personel bulunamadı" }, { status: 404 })
  }

  const explicit = new Map<string, boolean>()
  for (const p of staff.permissions) {
    explicit.set(permissionKey(p.module, p.action), p.granted)
  }

  const matrix = buildPermissionMatrix(
    staff.permissions.map((p) => ({
      module: p.module,
      action: p.action,
      granted: p.granted,
    }))
  )

  return NextResponse.json({
    staff: {
      id: staff.id,
      firstName: staff.firstName,
      lastName: staff.lastName,
      department: staff.department,
      hasGeziAccess: staff.hasGeziAccess,
      hasIbAccess: staff.hasIbAccess,
    },
    matrix,
  })
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await requireSuperAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 })
  }

  const { id } = await context.params
  const body = await request.json()
  const entries: Array<{ module: string; action: string; granted: boolean }> =
    body.entries ?? []

  if (!Array.isArray(entries)) {
    return NextResponse.json({ error: "entries dizisi gerekli" }, { status: 400 })
  }

  const staff = await prisma.staff.findUnique({ where: { id } })
  if (!staff) {
    return NextResponse.json({ error: "Personel bulunamadı" }, { status: 404 })
  }

  await prisma.$transaction(async (tx) => {
    await replaceStaffPermissions(tx, id, entries)
  })

  return NextResponse.json({ success: true })
}
