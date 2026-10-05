import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor } from "@/lib/hr/actor"
import { canViewFinance } from "@/lib/finance/access"

export async function GET(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 })
  if (!(await canViewFinance(actor.staffId, actor.department))) {
    return NextResponse.json({ error: "Finans görüntüleme yetkiniz yok." }, { status: 403 })
  }

  const month = request.nextUrl.searchParams.get("month")
  const where =
    month && /^\d{4}-\d{2}$/.test(month) ? { yearMonth: month } : undefined

  const entries = await prisma.financeCashbookEntry.findMany({
    where,
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take: 500,
  })

  const income = entries.filter((e) => e.side === "INCOME")
  const expense = entries.filter((e) => e.side === "EXPENSE")
  const incomeTotal = income.reduce((s, e) => s + Number(e.amount), 0)
  const expenseTotal = expense.reduce((s, e) => s + Number(e.amount), 0)

  return NextResponse.json({
    month: month ?? null,
    income,
    expense,
    incomeTotal,
    expenseTotal,
    net: incomeTotal - expenseTotal,
  })
}
