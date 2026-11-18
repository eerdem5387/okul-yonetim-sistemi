import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor } from "@/lib/hr/actor"
import { sanitizeNavOrder } from "@/lib/nav-order"

/** Oturum açan personelin kenar menü sırası (web + mobil ortak). */
export async function GET(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 })

  const pref = await prisma.staffNavPreference.findUnique({ where: { staffId: actor.staffId } })
  return NextResponse.json({
    order: sanitizeNavOrder(pref?.order ?? []),
    updatedAt: pref?.updatedAt ?? null,
  })
}

/** Sırayı kaydeder. Boş liste varsayılan sıraya döndürür. */
export async function PUT(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 })

  const body = (await request.json().catch(() => null)) as { order?: unknown } | null
  if (!body || !Array.isArray(body.order)) {
    return NextResponse.json({ error: "Menü sırası liste olmalı." }, { status: 400 })
  }
  const order = sanitizeNavOrder(body.order)

  if (order.length === 0) {
    await prisma.staffNavPreference.deleteMany({ where: { staffId: actor.staffId } })
    return NextResponse.json({ order: [], updatedAt: null })
  }

  const saved = await prisma.staffNavPreference.upsert({
    where: { staffId: actor.staffId },
    create: { staffId: actor.staffId, order },
    update: { order },
  })
  return NextResponse.json({ order, updatedAt: saved.updatedAt })
}
