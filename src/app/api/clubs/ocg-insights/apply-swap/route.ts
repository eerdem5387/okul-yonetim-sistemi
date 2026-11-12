import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { resolveStaffActor } from "@/lib/hr/actor"
import { swapClubScheduleSlots } from "@/lib/clubs/swap-club-schedules"

export const dynamic = "force-dynamic"

/** POST /api/clubs/ocg-insights/apply-swap — iki kulübün program yerlerini değiştir */
export async function POST(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    clubAId?: string
    clubBId?: string
  }
  const clubAId = body.clubAId?.trim()
  const clubBId = body.clubBId?.trim()
  if (!clubAId || !clubBId) {
    return NextResponse.json({ error: "clubAId ve clubBId gerekli." }, { status: 400 })
  }

  try {
    const result = await swapClubScheduleSlots(clubAId, clubBId)
    return NextResponse.json({
      ok: true,
      message: `${result.clubA.name} ile ${result.clubB.name} program yerleri değiştirildi.`,
      ...result,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Yer değişimi uygulanamadı."
    console.error("[apply-swap]", err)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
