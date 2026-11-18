import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor } from "@/lib/hr/actor"
import {
  approvalSlotFor,
  canAccessExpenseRequests,
  describeApproval,
} from "@/lib/finance/expense-approval"
import {
  callMuhasebeExpenseDecision,
  pullMuhasebeFinanceSnapshot,
  upsertFinanceExpenseRequest,
} from "@/lib/finance/muhasebe-sync"

export async function GET(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 })
  if (!canAccessExpenseRequests(actor.department)) {
    return NextResponse.json(
      { error: "Harcama taleplerini yalnızca kurucu ve müdür görebilir." },
      { status: 403 },
    )
  }
  const viewerSlot = approvalSlotFor(actor.department)

  const status = request.nextUrl.searchParams.get("status")
  const rows = await prisma.financeExpenseRequest.findMany({
    where:
      status === "PENDING" ||
      status === "APPROVED" ||
      status === "COMPLETED" ||
      status === "REJECTED"
        ? { status }
        : undefined,
    orderBy: { sourceCreatedAt: "desc" },
    take: 200,
  })
  return NextResponse.json({
    viewer: { slot: viewerSlot },
    requests: rows.map((row) => ({ ...row, approval: describeApproval(row, viewerSlot) })),
  })
}

export async function POST(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as {
    action?: "approve" | "reject" | "sync"
    id?: string
    reason?: string
  }

  if (body.action === "sync") {
    if (!canAccessExpenseRequests(actor.department)) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 403 })
    }
    try {
      const snapshot = await pullMuhasebeFinanceSnapshot()
      return NextResponse.json({
        ok: true,
        requests: snapshot.expenseRequests?.length ?? 0,
        cashbook: snapshot.cashbookEntries?.length ?? 0,
      })
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Senkron başarısız." },
        { status: 502 },
      )
    }
  }

  const slot = approvalSlotFor(actor.department)
  if (!slot) {
    return NextResponse.json(
      { error: "Harcama taleplerini yalnızca kurucu ve müdür onaylayabilir." },
      { status: 403 },
    )
  }

  const id = body.id?.trim()
  if (!id || (body.action !== "approve" && body.action !== "reject")) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 })
  }

  const local = await prisma.financeExpenseRequest.findUnique({ where: { id } })
  if (!local) return NextResponse.json({ error: "Talep bulunamadı." }, { status: 404 })
  if (local.status !== "PENDING") {
    return NextResponse.json({ error: "Talep zaten sonuçlanmış." }, { status: 409 })
  }
  if (body.action === "approve") {
    const alreadyBySlot = slot === "founder" ? local.founderApprovedAt : local.principalApprovedAt
    if (alreadyBySlot) {
      return NextResponse.json(
        {
          error:
            slot === "founder"
              ? "Kurucu onayı bu talep için zaten verilmiş; müdür onayı bekleniyor."
              : "Müdür onayı bu talep için zaten verilmiş; kurucu onayı bekleniyor.",
        },
        { status: 409 },
      )
    }
  }

  const actorId = `oys:${actor.staffId}`
  const actorName = [actor.firstName, actor.lastName].filter(Boolean).join(" ").trim() || null
  try {
    const result = (await callMuhasebeExpenseDecision({
      requestId: id,
      action: body.action,
      as: slot,
      actorId,
      actorName,
      reason: body.reason,
      tenantId: local.muhasebeTenantId,
    })) as { request?: Record<string, unknown> }

    if (result.request) {
      await upsertFinanceExpenseRequest(local.muhasebeTenantId, result.request)
    } else {
      // Muhasebe kaydı döndürmediyse onay durumunu tahmin etme; kaynaktan yeniden çek.
      await pullMuhasebeFinanceSnapshot(local.muhasebeTenantId)
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Muhasebe güncellenemedi." },
      { status: 502 },
    )
  }

  const updated = await prisma.financeExpenseRequest.findUnique({ where: { id } })
  return NextResponse.json({
    ok: true,
    request: updated ? { ...updated, approval: describeApproval(updated, slot) } : null,
  })
}
