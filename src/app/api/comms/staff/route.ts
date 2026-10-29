import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor } from "@/lib/hr/actor"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const staff = await prisma.staff.findMany({
    where: { isActive: true, id: { not: actor.staffId } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      department: true,
      subject: true,
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  })
  return NextResponse.json({ staff })
}
