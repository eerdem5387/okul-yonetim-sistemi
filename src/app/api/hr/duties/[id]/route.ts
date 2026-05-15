import { NextRequest, NextResponse } from "next/server"
import { resolveStaffActor, requireAdmin } from "@/lib/hr/actor"
import { deleteDuty, updateDuty } from "@/lib/hr/duties"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

/** PATCH /api/hr/duties/[id] - nöbet güncelle (admin-only) */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  if (!requireAdmin(actor)) {
    return NextResponse.json({ error: "Bu işlem için yetkiniz yok" }, { status: 403 })
  }

  const { id } = await context.params
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
    const duty = await updateDuty({
      id,
      staffId,
      dayOfWeek: Number(dayOfWeek),
      location: location.trim(),
      notes: notes ?? null,
    })
    return NextResponse.json(duty)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

/** DELETE /api/hr/duties/[id] - nöbet sil (admin-only) */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  if (!requireAdmin(actor)) {
    return NextResponse.json({ error: "Bu işlem için yetkiniz yok" }, { status: 403 })
  }

  const { id } = await context.params
  await deleteDuty(id)
  return NextResponse.json({ ok: true })
}
