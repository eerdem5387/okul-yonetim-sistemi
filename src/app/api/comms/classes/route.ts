import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor } from "@/lib/hr/actor"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const year = await prisma.academicYear.findFirst({
    where: { isActive: true, parentActiveYearId: null },
    select: { id: true },
  })
  const classes = await prisma.class.findMany({
    where: year ? { academicYearId: year.id } : {},
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })
  return NextResponse.json({ classes })
}
