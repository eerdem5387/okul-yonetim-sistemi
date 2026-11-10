import type { FinanceExpenseRequest } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { sendExpoPush } from "./expo-push"

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

/** Kurucu / süper admin cihazlarına bekleyen harcama talebi push'u. */
export async function notifyFoundersPendingExpenseRequest(
  row: Pick<
    FinanceExpenseRequest,
    "id" | "title" | "requesterName" | "channel" | "total" | "notes" | "status"
  >,
): Promise<void> {
  if (row.status !== "PENDING") return

  const founders = await prisma.staff.findMany({
    where: {
      isActive: true,
      department: { in: ["KURUCU", "SUPER_ADMIN"] },
    },
    select: { id: true },
  })
  if (founders.length === 0) return

  const devices = await prisma.staffPushDevice.findMany({
    where: { staffId: { in: founders.map((f) => f.id) } },
    select: { token: true },
  })
  if (devices.length === 0) return

  const uniqueTokens = [...new Set(devices.map((d) => d.token))]
  await sendExpoPush(
    uniqueTokens.map((to) => ({
      to,
      title: "Yeni harcama talebi",
      body: buildBody(row),
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
