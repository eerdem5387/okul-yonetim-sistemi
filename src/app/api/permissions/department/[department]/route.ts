import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSuperAdmin } from "@/lib/permissions"
import {
  isBulkAssignableDepartment,
  bulkDepartmentLabel,
  type BulkAssignableDepartment,
} from "@/lib/permissions/bulk"
import { buildPermissionMatrix, emptyPermissionMatrix } from "@/lib/permissions/matrix"
import { replaceStaffPermissions } from "@/lib/permissions/persist"

type RouteContext = { params: Promise<{ department: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const admin = await requireSuperAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 })
  }

  const { department: deptParam } = await context.params
  if (!isBulkAssignableDepartment(deptParam)) {
    return NextResponse.json({ error: "Geçersiz departman" }, { status: 400 })
  }

  const department = deptParam as BulkAssignableDepartment
  const template = request.nextUrl.searchParams.get("template") ?? "empty"

  const staffList = await prisma.staff.findMany({
    where: { department, isActive: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  })

  let matrix = emptyPermissionMatrix()
  if (template === "first" && staffList.length > 0) {
    const first = await prisma.staff.findUnique({
      where: { id: staffList[0].id },
      select: {
        permissions: { select: { module: true, action: true, granted: true } },
      },
    })
    if (first) {
      matrix = buildPermissionMatrix(first.permissions)
    }
  }

  return NextResponse.json({
    department,
    label: bulkDepartmentLabel(department),
    staffCount: staffList.length,
    staff: staffList.map((s) => ({
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
    })),
    matrix,
  })
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const admin = await requireSuperAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 })
  }

  const { department: deptParam } = await context.params
  if (!isBulkAssignableDepartment(deptParam)) {
    return NextResponse.json({ error: "Geçersiz departman" }, { status: 400 })
  }

  const department = deptParam as BulkAssignableDepartment
  const body = await request.json()
  const entries: Array<{ module: string; action: string; granted: boolean }> =
    body.entries ?? []

  if (!Array.isArray(entries)) {
    return NextResponse.json({ error: "entries dizisi gerekli" }, { status: 400 })
  }

  const staffList = await prisma.staff.findMany({
    where: { department, isActive: true },
    select: { id: true },
  })

  if (staffList.length === 0) {
    return NextResponse.json(
      { error: "Bu departmanda aktif personel bulunamadı" },
      { status: 404 }
    )
  }

  await prisma.$transaction(async (tx) => {
    for (const s of staffList) {
      await replaceStaffPermissions(tx, s.id, entries)
    }
  })

  return NextResponse.json({
    success: true,
    department,
    label: bulkDepartmentLabel(department),
    updatedCount: staffList.length,
  })
}
