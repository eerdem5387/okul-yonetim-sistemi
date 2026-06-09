import { NextRequest, NextResponse } from "next/server"
import { resolveStaffActor } from "@/lib/hr/actor"
import { requireHrRetentionAccess } from "@/lib/hr-retention/access"
import { getStaffDashboardData } from "@/lib/hr/retention"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const retentionAuth = await requireHrRetentionAccess(request, "view")
  const canViewRetention = !retentionAuth.response

  if (!actor.isAdmin && actor.staffId !== id && !canViewRetention) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 })
  }

  const data = await getStaffDashboardData(id)
  if (!data) return NextResponse.json({ error: "Personel bulunamadı" }, { status: 404 })

  return NextResponse.json(data)
}
