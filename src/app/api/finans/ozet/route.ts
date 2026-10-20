import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor } from "@/lib/hr/actor"
import { canApproveFinance, canViewFinance } from "@/lib/finance/access"
import { fetchMuhasebeFinanceSummary } from "@/lib/finance/muhasebe-sync"

function monthKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

function lastNMonths(n: number, fromYm?: string): string[] {
  const out: string[] = []
  let base: Date
  if (fromYm && /^\d{4}-\d{2}$/.test(fromYm)) {
    const [y, m] = fromYm.split("-").map(Number)
    base = new Date(y, m - 1, 1)
  } else {
    base = new Date()
    base.setDate(1)
  }
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(base.getFullYear(), base.getMonth() - i, 1)
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

  const monthParam = request.nextUrl.searchParams.get("month")
  const months = lastNMonths(6, monthParam ?? undefined)
  const currentMonth = months[months.length - 1]

  const [
    entries,
    monthEntriesDetail,
    pendingRequests,
    awaitingAccounting,
    recentRequests,
    recentMovements,
    statusGroups,
    live,
  ] = await Promise.all([
    prisma.financeCashbookEntry.findMany({
      where: { yearMonth: { in: months } },
      select: { yearMonth: true, side: true, amount: true },
    }),
    prisma.financeCashbookEntry.findMany({
      where: { yearMonth: currentMonth },
      select: { side: true, amount: true, channel: true, incomeCategory: true },
    }),
    prisma.financeExpenseRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { sourceCreatedAt: "desc" },
      take: 50,
    }),
    prisma.financeExpenseRequest.findMany({
      where: { status: "APPROVED" },
      orderBy: { founderApprovedAt: "desc" },
      take: 20,
    }),
    prisma.financeExpenseRequest.findMany({
      orderBy: { sourceCreatedAt: "desc" },
      take: 12,
    }),
    prisma.financeCashbookEntry.findMany({
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      take: 25,
    }),
    prisma.financeExpenseRequest.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    fetchMuhasebeFinanceSummary(currentMonth),
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

  const localIncome = monthEntriesDetail
    .filter((e) => e.side === "INCOME")
    .reduce((s, e) => s + Number(e.amount), 0)
  const localExpense = monthEntriesDetail
    .filter((e) => e.side === "EXPENSE")
    .reduce((s, e) => s + Number(e.amount), 0)

  const expenseByChannel: Record<string, number> = {}
  const incomeByCategory: Record<string, number> = {}
  for (const e of monthEntriesDetail) {
    const amt = Number(e.amount)
    if (e.side === "EXPENSE") {
      const ch = e.channel || "CASH"
      expenseByChannel[ch] = (expenseByChannel[ch] ?? 0) + amt
    } else {
      const cat = e.incomeCategory || "OTHER"
      incomeByCategory[cat] = (incomeByCategory[cat] ?? 0) + amt
    }
  }

  // Canlı muhasebe varsa kanal/kategori ve trendi ondan tercih et
  const expenseByChannelFinal = live?.cashbook.expenseByChannel ?? expenseByChannel
  const incomeByCategoryFinal = live?.cashbook.incomeByCategory ?? incomeByCategory
  const seriesFinal = live?.series?.length ? live.series : series

  const current = {
    month: currentMonth,
    income: live?.cashbook.income ?? localIncome,
    expense: live?.cashbook.expense ?? localExpense,
    net: live?.cashbook.net ?? localIncome - localExpense,
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
    series: seriesFinal,
    pendingRequests,
    awaitingAccounting,
    recentRequests,
    recentMovements,
    requestCounts,
    breakdowns: {
      expenseByChannel: expenseByChannelFinal,
      incomeByCategory: incomeByCategoryFinal,
    },
    live: live
      ? {
          available: true,
          tenantName: live.tenantName,
          exportedAt: live.exportedAt,
          schedule: live.schedule,
          students: live.students,
          requests: live.requests,
        }
      : { available: false },
    canApprove: await canApproveFinance(actor.staffId, actor.department),
  })
}
