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

function asStatus(value: unknown): "PENDING" | "APPROVED" | "COMPLETED" | "REJECTED" {
  if (value === "APPROVED" || value === "REJECTED" || value === "PENDING" || value === "COMPLETED") {
    return value
  }
  return "PENDING"
}

export async function upsertFinanceExpenseRequest(
  tenantId: string,
  data: Record<string, unknown>,
) {
  const id = String(data.id ?? "")
  if (!id) throw new Error("expense_request id gerekli")

  const totalRaw = data.total
  const payload = {
    muhasebeTenantId: tenantId,
    title: String(data.title ?? ""),
    total: totalRaw == null || totalRaw === "" ? null : asDecimal(totalRaw),
    requesterName: String(data.requesterName ?? ""),
    channel: String(data.channel ?? "BANK"),
    status: asStatus(data.status),
    notes: data.notes == null ? null : String(data.notes),
    createdById: data.createdById == null ? null : String(data.createdById),
    principalApprovedAt: asDate(data.principalApprovedAt),
    principalApprovedBy: data.principalApprovedBy == null ? null : String(data.principalApprovedBy),
    founderApprovedAt: asDate(data.founderApprovedAt),
    founderApprovedBy: data.founderApprovedBy == null ? null : String(data.founderApprovedBy),
    founderApprovedByName:
      data.founderApprovedByName == null ? null : String(data.founderApprovedByName),
    completedAt: asDate(data.completedAt),
    completedById: data.completedById == null ? null : String(data.completedById),
    rejectedAt: asDate(data.rejectedAt),
    rejectedById: data.rejectedById == null ? null : String(data.rejectedById),
    rejectedByName: data.rejectedByName == null ? null : String(data.rejectedByName),
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
  actorName?: string | null
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
      actorName: input.actorName?.trim() || null,
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

export type MuhasebeFinanceSummary = {
  tenantId: string
  tenantName: string | null
  yearMonth: string
  exportedAt: string
  schedule: { realized: number; expected: number; blocked: number }
  cashbook: {
    income: number
    expense: number
    net: number
    expenseByChannel: Record<string, number>
    incomeByCategory: Record<string, number>
  }
  series: Array<{ month: string; income: number; expense: number; net: number }>
  requests: { pending: number; approvedAwaiting: number }
  students: {
    total: number
    activeEnrollments: number
    collectedEnrollments: number
    collectionRate: number
    collectionAmount: number
  }
  founder?: {
    tenantName?: string | null
    academicYear: string | null
    expectedIncome: number
    collectedTotal: number
    collectedNew: number
    collectedRenewal: number
    collectedUnclassified: number
    incomeCategories?: Array<{ name: string; amount: number }>
    incomeDetails?: Array<{
      id: string
      category: string
      title: string
      occurredAt: string
      amount: number
      channel: string | null
      channelLabel: string
    }>
    expenseMonth: string
    expenseTotal: number
    expenses: Array<{ id: string; occurredAt: string; title: string; amount: number; channel: string }>
    selectedMonth: string
    ledgerIncome: number
    ledgerExpense: number
    months: string[]
    rows: Array<{
      id: string
      side: string
      occurredAt: string
      title: string
      amount: number
      channel?: string | null
      channelLabel?: string | null
      tag?: "PLANNED" | "CREDITED" | null
      expenseTitle?: string | null
      payeeIdentityNo?: string | null
      invoiceNo?: string | null
      notes?: string | null
      bankName?: string | null
      checkInstallments?: number | null
      incomeCategory?: string | null
      payerFirstName?: string | null
      payerLastName?: string | null
      payerIdentityNo?: string | null
    }>
    daily: Array<{ date: string; income: number; expense: number }>
  }
}

/** Canlı KPI — muhasebe anlık özet (yerel kopya değil). Başarısızsa null. */
export async function fetchMuhasebeFinanceSummary(
  month?: string,
  tenantId?: string,
  academicYear?: string
): Promise<MuhasebeFinanceSummary | null> {
  const base = muhasebeBaseUrl()
  const secret = muhasebeIntegrationSecret()
  if (!base || !secret) return null

  const url = new URL(`${base}/api/integrations/okul/finance-summary`)
  if (month) url.searchParams.set("month", month)
  if (tenantId) url.searchParams.set("tenantId", tenantId)
  if (academicYear) url.searchParams.set("academicYear", academicYear)

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${secret}`,
        "X-Service-Secret": secret,
      },
      cache: "no-store",
    })
    if (!res.ok) return null
    return (await res.json()) as MuhasebeFinanceSummary
  } catch {
    return null
  }
}
