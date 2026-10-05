import { NextResponse } from "next/server"
import { headers } from "next/headers"
import {
  upsertFinanceCashbookEntry,
  upsertFinanceExpenseRequest,
} from "@/lib/finance/muhasebe-sync"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const headersList = await headers()
  const webhookSecret = headersList.get("x-webhook-secret")
  const serviceSecret = headersList.get("x-service-secret")
  const auth = headersList.get("authorization")
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null

  const expectedWebhook = process.env.WEBHOOK_SECRET?.trim()
  const expectedService =
    process.env.INTEGRATION_SECRET?.trim() || process.env.SERVICE_API_SECRET?.trim()

  const ok =
    (!expectedWebhook && !expectedService && process.env.NODE_ENV !== "production") ||
    (expectedWebhook && (webhookSecret === expectedWebhook || bearer === expectedWebhook)) ||
    (expectedService && (serviceSecret === expectedService || bearer === expectedService))

  if (!ok) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as {
    eventType?: string
    tenantId?: string
    data?: Record<string, unknown>
  } | null

  if (!body?.eventType || !body.tenantId || !body.data) {
    return NextResponse.json({ error: "Geçersiz olay gövdesi." }, { status: 400 })
  }

  try {
    switch (body.eventType) {
      case "expense_request.upserted":
        await upsertFinanceExpenseRequest(body.tenantId, body.data)
        break
      case "cashbook_entry.upserted":
        await upsertFinanceCashbookEntry(body.tenantId, body.data)
        break
      case "expense_request.deleted": {
        const id = String(body.data.id ?? "")
        if (id) await prisma.financeExpenseRequest.deleteMany({ where: { id } })
        break
      }
      case "cashbook_entry.deleted": {
        const id = String(body.data.id ?? "")
        if (id) await prisma.financeCashbookEntry.deleteMany({ where: { id } })
        break
      }
      default:
        return NextResponse.json({ error: `Bilinmeyen olay: ${body.eventType}` }, { status: 400 })
    }
  } catch (err) {
    console.error("[webhook/muhasebe]", err)
    return NextResponse.json({ error: "İşlenemedi." }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
