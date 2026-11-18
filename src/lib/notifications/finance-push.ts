import type { FinanceExpenseRequest, StaffDepartment } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { sendExpoPush } from "./expo-push"
import { requiresDualApproval, type ApprovalSlot } from "@/lib/finance/expense-approval"

const CHANNEL_TR: Record<string, string> = {
  BANK: "Banka",
  CHECK: "Çek",
  CREDIT_CARD: "Kredi kartı",
  CASH: "Nakit",
  PROMISSORY: "Senet",
}

function channelLabel(channel: string): string {
  return CHANNEL_TR[channel] ?? channel
}

function formatTry(total: FinanceExpenseRequest["total"]): string | null {
  if (total == null) return null
  const n = Number(total)
  if (!Number.isFinite(n)) return null
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(n)
}

function buildBody(row: Pick<FinanceExpenseRequest, "title" | "requesterName" | "channel" | "total" | "notes">): string {
  const parts = [
    row.requesterName?.trim() || null,
    row.title?.trim() || null,
    formatTry(row.total),
    channelLabel(row.channel),
  ].filter(Boolean) as string[]

  let body = parts.join(" · ")
  const notes = row.notes?.trim()
  if (notes) {
    const withNotes = `${body} — ${notes}`
    body = withNotes.length > 180 ? `${withNotes.slice(0, 177)}…` : withNotes
  } else if (body.length > 180) {
    body = `${body.slice(0, 177)}…`
  }
  return body || "Yeni harcama talebi bekliyor."
}

type PushRow = Pick<
  FinanceExpenseRequest,
  "id" | "title" | "requesterName" | "channel" | "total" | "notes" | "status"
> & {
  founderApprovedByName?: string | null
  principalApprovedByName?: string | null
}

const DEPARTMENTS_BY_SLOT: Record<ApprovalSlot, StaffDepartment[]> = {
  founder: ["KURUCU"],
  principal: ["MUDUR"],
}

async function tokensForDepartments(departments: StaffDepartment[]): Promise<string[]> {
  const staff = await prisma.staff.findMany({
    where: { isActive: true, department: { in: departments } },
    select: { id: true },
  })
  if (staff.length === 0) return []
  const devices = await prisma.staffPushDevice.findMany({
    where: { staffId: { in: staff.map((s) => s.id) } },
    select: { token: true },
  })
  return [...new Set(devices.map((d) => d.token))]
}

async function sendFinancePush(tokens: string[], row: PushRow, title: string, body: string) {
  if (tokens.length === 0) return
  await sendExpoPush(
    tokens.map((to) => ({
      to,
      title,
      body,
      sound: "default",
      priority: "high",
      channelId: "finance-requests",
      data: {
        type: "finance_expense_request",
        requestId: row.id,
        status: row.status,
        href: "/finans/talepler",
      },
    })),
  )
}

/** Yeni bekleyen talep: tüm kurucu ve müdür cihazlarına push. */
export async function notifyApproversPendingExpenseRequest(row: PushRow): Promise<void> {
  if (row.status !== "PENDING") return
  const tokens = await tokensForDepartments(["KURUCU", "MUDUR"])
  const title = requiresDualApproval(row.total)
    ? "Yeni harcama talebi · çift onay"
    : "Yeni harcama talebi"
  await sendFinancePush(tokens, row, title, buildBody(row))
}

/** Çift onaylı talepte ilk onay verildi: diğer rolden onay iste. */
export async function notifyAwaitingSecondApproval(row: PushRow, approvedSlot: ApprovalSlot): Promise<void> {
  if (row.status !== "PENDING") return
  const waitingSlot: ApprovalSlot = approvedSlot === "founder" ? "principal" : "founder"
  const tokens = await tokensForDepartments(DEPARTMENTS_BY_SLOT[waitingSlot])
  const approverName =
    (approvedSlot === "founder" ? row.founderApprovedByName : row.principalApprovedByName)?.trim() ||
    (approvedSlot === "founder" ? "Kurucu" : "Müdür")
  await sendFinancePush(
    tokens,
    row,
    "Onayınız bekleniyor",
    `${approverName} onayladı · ${buildBody(row)}`.slice(0, 180),
  )
}
