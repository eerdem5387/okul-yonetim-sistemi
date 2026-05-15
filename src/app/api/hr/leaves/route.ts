import { NextRequest, NextResponse } from "next/server"
import type { LeaveStatus, LeaveType } from "@prisma/client"
import { resolveStaffActor } from "@/lib/hr/actor"
import { createLeave, listLeaves } from "@/lib/hr/leaves"

export const dynamic = "force-dynamic"

const LEAVE_TYPES: LeaveType[] = ["ANNUAL", "SICK_REPORT", "EXCUSE", "UNPAID", "HOURLY"]
const LEAVE_STATUSES: LeaveStatus[] = ["PENDING", "APPROVED", "REJECTED"]

/** GET /api/hr/leaves - filtrelenmiş izin listesi */
export async function GET(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const sp = request.nextUrl.searchParams
  const requestedStaffId = sp.get("staffId") || undefined
  const status = sp.get("status") as LeaveStatus | null
  const fromStr = sp.get("from")
  const toStr = sp.get("to")

  // Admin değilse sadece kendi izinlerini görebilir
  const staffId = actor.isAdmin ? requestedStaffId : actor.staffId

  const leaves = await listLeaves({
    staffId,
    status: status && LEAVE_STATUSES.includes(status) ? status : undefined,
    from: fromStr ? new Date(fromStr) : undefined,
    to: toStr ? new Date(toStr) : undefined,
  })
  return NextResponse.json({ leaves })
}

/** POST /api/hr/leaves - yeni izin talebi (kendi adına) */
export async function POST(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 })

  const { type, startDate, endDate, reason, staffId } = body as {
    type?: LeaveType
    startDate?: string
    endDate?: string
    reason?: string | null
    staffId?: string
  }

  if (!type || !LEAVE_TYPES.includes(type)) {
    return NextResponse.json({ error: "Geçersiz izin tipi" }, { status: 400 })
  }
  if (!startDate || !endDate) {
    return NextResponse.json({ error: "Başlangıç ve bitiş tarihi zorunlu" }, { status: 400 })
  }

  const start = new Date(startDate)
  const end = new Date(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return NextResponse.json({ error: "Geçersiz tarih" }, { status: 400 })
  }

  // Admin başkası adına talep oluşturabilir; diğerleri sadece kendi adına
  const targetStaffId = actor.isAdmin && staffId ? staffId : actor.staffId

  try {
    const leave = await createLeave({
      staffId: targetStaffId,
      type,
      startDate: start,
      endDate: end,
      reason: reason ?? null,
    })
    return NextResponse.json(leave, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
