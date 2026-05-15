import { NextRequest, NextResponse } from "next/server"
import { resolveStaffActor } from "@/lib/hr/actor"
import { getLeaveScheduleConflicts } from "@/lib/hr/leaves"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

/**
 * GET /api/hr/leaves/[id]/conflicts
 * İlgili iznin kapsadığı her iş günü için personelin haftalık ders programındaki
 * dersleri döner. Admin veya iznin sahibi erişebilir.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const { id } = await context.params
  const conflicts = await getLeaveScheduleConflicts(id)
  if (conflicts === null) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 })

  return NextResponse.json({ conflicts })
}
