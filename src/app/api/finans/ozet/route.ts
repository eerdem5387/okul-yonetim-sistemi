import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor } from "@/lib/hr/actor"
import { canApproveFinance, canViewFinance } from "@/lib/finance/access"

function monthKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

function lastNMonths(n: number): string[] {
  const out: string[] = []
  const d = new Date()
  d.setDate(1)
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1)
    out.push(monthKey(x))
  }
  return out
}

export async function GET(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 })
  if (!(await canViewFinance(actor.staffId, actor.department))) {
    return NextResponse.json({ error: "Finans görüntüleme yetkiniz yok." }, { status: 403 })
  }

  const months = lastNMonths(6)
  const currentMonth = months[months.length - 1]

  const [entries, pendingRequests, recentRequests, recentMovements, statusGroups] =
    await Promise.all([
      prisma.financeCashbookEntry.findMany({
        where: { yearMonth: { in: months } },
        select: { yearMonth: true, side: true, amount: true },
      }),
      prisma.financeExpenseRequest.findMany({
        where: { status: "PENDING" },
        orderBy: { sourceCreatedAt: "desc" },
        take: 50,
      }),
      prisma.financeExpenseRequest.findMany({
        orderBy: { sourceCreatedAt: "desc" },
        take: 12,
      }),
      prisma.financeCashbookEntry.findMany({
        orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
        take: 20,
      }),
      prisma.financeExpenseRequest.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
    ])

  const series = months.map((ym) => {
    const monthEntries = entries.filter((e) => e.yearMonth === ym)
    const income = monthEntries
      .filter((e) => e.side === "INCOME")
      .reduce((s, e) => s + Number(e.amount), 0)
    const expense = monthEntries
      .filter((e) => e.side === "EXPENSE")
      .reduce((s, e) => s + Number(e.amount), 0)
    return { month: ym, income, expense, net: income - expense }
  })

  const current = series.find((s) => s.month === currentMonth) ?? {
    month: currentMonth,
    income: 0,
    expense: 0,
    net: 0,
  }

  const requestCounts = {
    PENDING: 0,
    APPROVED: 0,
    COMPLETED: 0,
    REJECTED: 0,
  }
  for (const g of statusGroups) {
    if (g.status in requestCounts) {
      requestCounts[g.status as keyof typeof requestCounts] = g._count._all
    }
  }

  return NextResponse.json({
    currentMonth,
    current,
    series,
    pendingRequests,
    recentRequests,
    recentMovements,
    requestCounts,
    canApprove: await canApproveFinance(actor.staffId, actor.department),
  })
}
