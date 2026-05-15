import { NextRequest, NextResponse } from "next/server"
import { resolveStaffActor, requireAdmin } from "@/lib/hr/actor"
import { createDuty, listDuties } from "@/lib/hr/duties"

export const dynamic = "force-dynamic"

/** GET /api/hr/duties - tüm nöbet atamaları (her personel kendi sayfasında görebilir) */
export async function GET(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const sp = request.nextUrl.searchParams
  const staffId = sp.get("staffId") || undefined
  const dayOfWeekStr = sp.get("dayOfWeek")
  const dayOfWeek = dayOfWeekStr ? Number(dayOfWeekStr) : undefined

  const duties = await listDuties({ staffId, dayOfWeek })
  return NextResponse.json({ duties })
}

/** POST /api/hr/duties - yeni nöbet atama (admin-only) */
export async function POST(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  if (!requireAdmin(actor)) {
    return NextResponse.json({ error: "Bu işlem için yetkiniz yok" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 })

  const { staffId, dayOfWeek, location, notes } = body as {
    staffId?: string
    dayOfWeek?: number
    location?: string
    notes?: string | null
  }
  if (!staffId || !dayOfWeek || !location?.trim()) {
    return NextResponse.json({ error: "staffId, dayOfWeek, location zorunlu" }, { status: 400 })
  }

  try {
    const duty = await createDuty({
      staffId,
      dayOfWeek: Number(dayOfWeek),
      location: location.trim(),
      notes: notes ?? null,
    })
    return NextResponse.json(duty, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
