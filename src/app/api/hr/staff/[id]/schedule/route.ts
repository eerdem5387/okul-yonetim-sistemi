import { NextRequest, NextResponse } from "next/server"
import { resolveStaffActor } from "@/lib/hr/actor"
import { getWeeklyScheduleForStaff } from "@/lib/hr/schedule"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

/** GET /api/hr/staff/[id]/schedule - haftalık ders programı (giriş yapan herkes) */
export async function GET(request: NextRequest, context: RouteContext) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const { id } = await context.params
  const items = await getWeeklyScheduleForStaff(id)
  return NextResponse.json({ items })
}
