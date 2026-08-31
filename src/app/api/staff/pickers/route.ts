import { NextRequest, NextResponse } from "next/server"
import type { Prisma, StaffDepartment } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { CLASS_COUNSELOR_DEPARTMENTS } from "@/lib/staff-counseling"
import { resolveStaffPickerActor } from "@/lib/staff/picker-access"

/**
 * GET /api/staff/pickers?type=teachers|counselors|teachers-and-counselors
 * Dropdown / atama listeleri — staff.view yerine classes.view veya neredeyiz.view yeterli.
 */
export async function GET(request: NextRequest) {
  const actor = await resolveStaffPickerActor(request)
  if (!actor) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 })
  }

  const type = request.nextUrl.searchParams.get("type") ?? "teachers"

  let departments: StaffDepartment[] | undefined
  if (type === "teachers") {
    departments = ["OGRETMEN"]
  } else if (type === "counselors") {
    departments = [...CLASS_COUNSELOR_DEPARTMENTS]
  } else if (type === "teachers-and-counselors") {
    departments = ["OGRETMEN", ...CLASS_COUNSELOR_DEPARTMENTS]
  } else {
    return NextResponse.json({ error: "Geçersiz type parametresi" }, { status: 400 })
  }

  const where: Prisma.StaffWhereInput = {
    isActive: true,
    department: { in: departments },
  }

  const staff = await prisma.staff.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      department: true,
      subject: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 2000,
  })

  return NextResponse.json({ staff })
}
