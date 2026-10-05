import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor } from "@/lib/hr/actor"
import { canApproveFinance, canViewFinance } from "@/lib/finance/access"
import {
  callMuhasebeExpenseDecision,
  pullMuhasebeFinanceSnapshot,
  upsertFinanceExpenseRequest,
} from "@/lib/finance/muhasebe-sync"

export async function GET(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 })
  if (!(await canViewFinance(actor.staffId, actor.department))) {
    return NextResponse.json({ error: "Finans görüntüleme yetkiniz yok." }, { status: 403 })
  }

  const status = request.nextUrl.searchParams.get("status")
  const rows = await prisma.financeExpenseRequest.findMany({
    where: status === "PENDING" || status === "APPROVED" || status === "REJECTED" ? { status } : undefined,
    orderBy: { sourceCreatedAt: "desc" },
    take: 200,
  })
  return NextResponse.json({ requests: rows })
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
    if (!(await canViewFinance(actor.staffId, actor.department))) {
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

  if (!(await canApproveFinance(actor.staffId, actor.department))) {
    return NextResponse.json({ error: "Onay yetkiniz yok." }, { status: 403 })
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

  const actorId = `oys:${actor.staffId}`
  try {
    const result = (await callMuhasebeExpenseDecision({
      requestId: id,
      action: body.action,
      as: "founder",
      actorId,
      reason: body.reason,
      tenantId: local.muhasebeTenantId,
    })) as { request?: Record<string, unknown> }

    if (result.request) {
      await upsertFinanceExpenseRequest(local.muhasebeTenantId, result.request)
    } else if (body.action === "approve") {
      await prisma.financeExpenseRequest.update({
        where: { id },
        data: {
          founderApprovedAt: new Date(),
          founderApprovedBy: actorId,
          status: local.principalApprovedAt ? "APPROVED" : "PENDING",
        },
      })
    } else {
      await prisma.financeExpenseRequest.update({
        where: { id },
        data: {
          status: "REJECTED",
          rejectedAt: new Date(),
          rejectedById: actorId,
          rejectReason: body.reason?.trim() || null,
        },
      })
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Muhasebe güncellenemedi." },
      { status: 502 },
    )
  }

  const updated = await prisma.financeExpenseRequest.findUnique({ where: { id } })
  return NextResponse.json({ ok: true, request: updated })
}
