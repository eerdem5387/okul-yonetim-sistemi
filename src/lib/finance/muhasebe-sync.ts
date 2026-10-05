import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

function asDecimal(value: unknown, fallback = "0"): Prisma.Decimal {
  const raw = value == null || value === "" ? fallback : String(value)
  return new Prisma.Decimal(raw)
}

function asDate(value: unknown): Date | null {
  if (!value) return null
  const d = new Date(String(value))
  return Number.isNaN(d.getTime()) ? null : d
}

function asStatus(value: unknown): "PENDING" | "APPROVED" | "REJECTED" {
  if (value === "APPROVED" || value === "REJECTED" || value === "PENDING") return value
  return "PENDING"
}

export async function upsertFinanceExpenseRequest(
  tenantId: string,
  data: Record<string, unknown>,
) {
  const id = String(data.id ?? "")
  if (!id) throw new Error("expense_request id gerekli")

  const payload = {
    muhasebeTenantId: tenantId,
    title: String(data.title ?? ""),
    quantity: asDecimal(data.quantity, "1"),
    unitPrice: asDecimal(data.unitPrice),
    total: asDecimal(data.total),
    requesterName: String(data.requesterName ?? ""),
    channel: String(data.channel ?? "TRANSFER"),
    status: asStatus(data.status),
    notes: data.notes == null ? null : String(data.notes),
    createdById: data.createdById == null ? null : String(data.createdById),
    principalApprovedAt: asDate(data.principalApprovedAt),
    principalApprovedBy: data.principalApprovedBy == null ? null : String(data.principalApprovedBy),
    founderApprovedAt: asDate(data.founderApprovedAt),
    founderApprovedBy: data.founderApprovedBy == null ? null : String(data.founderApprovedBy),
    rejectedAt: asDate(data.rejectedAt),
    rejectedById: data.rejectedById == null ? null : String(data.rejectedById),
    rejectReason: data.rejectReason == null ? null : String(data.rejectReason),
    sourceCreatedAt: asDate(data.createdAt),
    sourceUpdatedAt: asDate(data.updatedAt),
    syncedAt: new Date(),
  }

  await prisma.financeExpenseRequest.upsert({
    where: { id },
    create: { id, ...payload },
    update: payload,
  })
}

export async function upsertFinanceCashbookEntry(
  tenantId: string,
  data: Record<string, unknown>,
) {
  const id = String(data.id ?? "")
  if (!id) throw new Error("cashbook_entry id gerekli")
  const occurredAt = asDate(data.occurredAt) ?? new Date()

  const payload = {
    muhasebeTenantId: tenantId,
    side: String(data.side ?? "EXPENSE"),
    yearMonth: String(data.yearMonth ?? occurredAt.toISOString().slice(0, 7)),
    amount: asDecimal(data.amount),
    occurredAt,
    channel: String(data.channel ?? "CASH"),
    bankName: data.bankName == null ? null : String(data.bankName),
    checkInstallments:
      data.checkInstallments == null || data.checkInstallments === ""
        ? null
        : Number(data.checkInstallments),
    incomeCategory: data.incomeCategory == null ? null : String(data.incomeCategory),
    payerFirstName: data.payerFirstName == null ? null : String(data.payerFirstName),
    payerLastName: data.payerLastName == null ? null : String(data.payerLastName),
    payerIdentityNo: data.payerIdentityNo == null ? null : String(data.payerIdentityNo),
    expenseTitle: data.expenseTitle == null ? null : String(data.expenseTitle),
    payeeIdentityNo: data.payeeIdentityNo == null ? null : String(data.payeeIdentityNo),
    invoiceNo: data.invoiceNo == null ? null : String(data.invoiceNo),
    notes: data.notes == null ? null : String(data.notes),
    sourceCreatedAt: asDate(data.createdAt),
    sourceUpdatedAt: asDate(data.updatedAt),
    syncedAt: new Date(),
  }

  await prisma.financeCashbookEntry.upsert({
    where: { id },
    create: { id, ...payload },
    update: payload,
  })
}

export async function applyFinanceSnapshot(snapshot: {
  tenantId: string
  expenseRequests?: Record<string, unknown>[]
  cashbookEntries?: Record<string, unknown>[]
}) {
  for (const row of snapshot.expenseRequests ?? []) {
    await upsertFinanceExpenseRequest(snapshot.tenantId, row)
  }
  for (const row of snapshot.cashbookEntries ?? []) {
    await upsertFinanceCashbookEntry(snapshot.tenantId, row)
  }
}

export function muhasebeBaseUrl(): string | null {
  const raw = process.env.MUHASEBE_URL?.trim() || process.env.MUHASEBE_INTEGRATION_URL?.trim() || ""
  return raw ? raw.replace(/\/$/, "") : null
}

export function muhasebeIntegrationSecret(): string | null {
  return (
    process.env.INTEGRATION_SECRET?.trim() ||
    process.env.SERVICE_API_SECRET?.trim() ||
    process.env.WEBHOOK_SECRET?.trim() ||
    null
  )
}

export async function callMuhasebeExpenseDecision(input: {
  requestId: string
  action: "approve" | "reject"
  as?: "founder" | "principal"
  actorId: string
  reason?: string
  tenantId?: string
}) {
  const base = muhasebeBaseUrl()
  const secret = muhasebeIntegrationSecret()
  if (!base || !secret) {
    throw new Error("MUHASEBE_URL / INTEGRATION_SECRET yapılandırılmamış.")
  }

  const res = await fetch(`${base}/api/integrations/okul/expense-requests/${input.requestId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
      "X-Service-Secret": secret,
    },
    body: JSON.stringify({
      action: input.action,
      as: input.as ?? "founder",
      actorId: input.actorId,
      reason: input.reason,
      tenantId: input.tenantId,
    }),
    cache: "no-store",
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((json as { error?: string }).error || `Muhasebe yanıtı: ${res.status}`)
  }
  return json
}

export async function pullMuhasebeFinanceSnapshot(tenantId?: string) {
  const base = muhasebeBaseUrl()
  const secret = muhasebeIntegrationSecret()
  if (!base || !secret) {
    throw new Error("MUHASEBE_URL / INTEGRATION_SECRET yapılandırılmamış.")
  }
  const url = new URL(`${base}/api/integrations/okul/finance-snapshot`)
  if (tenantId) url.searchParams.set("tenantId", tenantId)
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${secret}`,
      "X-Service-Secret": secret,
    },
    cache: "no-store",
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Snapshot alınamadı: ${res.status} ${text.slice(0, 200)}`)
  }
  const snapshot = (await res.json()) as {
    tenantId: string
    expenseRequests?: Record<string, unknown>[]
    cashbookEntries?: Record<string, unknown>[]
  }
  await applyFinanceSnapshot(snapshot)
  return snapshot
}
