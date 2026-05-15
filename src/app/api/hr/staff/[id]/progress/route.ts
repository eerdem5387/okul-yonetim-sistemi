import { NextRequest, NextResponse } from "next/server"
import { resolveStaffActor } from "@/lib/hr/actor"
import { getProgressSummaryForStaff } from "@/lib/hr/progress"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

/** GET /api/hr/staff/[id]/progress - öğretmenin sınıf+ders ilerlemesi */
export async function GET(request: NextRequest, context: RouteContext) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const { id } = await context.params
  const summary = await getProgressSummaryForStaff(id)
  return NextResponse.json({ summary })
}
