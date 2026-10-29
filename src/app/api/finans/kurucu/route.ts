import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor } from "@/lib/hr/actor"
import { canViewFinance } from "@/lib/finance/access"
import { fetchMuhasebeFinanceSummary } from "@/lib/finance/muhasebe-sync"
import { getRenewalTargetContext } from "@/lib/student-registration-meta"
import { buildEnrollmentRegistrationGradeBreakdown } from "@/lib/enrolled-grade-counts"
import { k12GradeWhereClause } from "@/lib/student-grade-level"

export const dynamic = "force-dynamic"

function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export async function GET(request: NextRequest) {
  const actor = await resolveStaffActor(request)
  if (!actor) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 })
  if (!(await canViewFinance(actor.staffId, actor.department))) {
    return NextResponse.json({ error: "Finans görüntüleme yetkiniz yok." }, { status: 403 })
  }

  const requestedMonth = request.nextUrl.searchParams.get("month")
  const ledgerMonth =
    requestedMonth && /^\d{4}-\d{2}$/.test(requestedMonth) ? requestedMonth : monthKey()

  const activeYear = await prisma.academicYear.findFirst({
    where: { isActive: true, parentActiveYearId: null },
    select: { id: true, name: true },
  })

  const [ctx, students] = await Promise.all([
    getRenewalTargetContext(prisma),
    prisma.student.findMany({
      where: k12GradeWhereClause(),
      select: { id: true, grade: true },
    }),
  ])
  const breakdown = buildEnrollmentRegistrationGradeBreakdown({
    students,
    renewedStudentIds: ctx.renewedStudentIds,
    newRegistrationStudentIds: ctx.newRegistrationStudentIds,
    newRegistrationActiveYearStudentIds: ctx.newRegistrationActiveYearStudentIds,
    futureYearOnlyNewRegistrationStudentIds: ctx.futureYearOnlyNewRegistrationStudentIds,
  })
  let newRegistrationCount = 0
  let renewalCount = 0
  for (const row of Object.values(breakdown)) {
    newRegistrationCount += row.newRegistration
    renewalCount += row.renewed
  }

  const live = await fetchMuhasebeFinanceSummary(
    ledgerMonth,
    undefined,
    activeYear?.name
  )

  let finance = live?.founder ?? null
  if (finance?.rows?.length) {
    const cashIds = finance.rows
      .map((row) => row.id)
      .filter((id) => id && !id.startsWith("plan:"))
    if (cashIds.length) {
      const localEntries = await prisma.financeCashbookEntry.findMany({
        where: { id: { in: cashIds } },
        select: {
          id: true,
          expenseTitle: true,
          payeeIdentityNo: true,
          invoiceNo: true,
          notes: true,
          bankName: true,
          checkInstallments: true,
          incomeCategory: true,
          payerFirstName: true,
          payerLastName: true,
          payerIdentityNo: true,
        },
      })
      const byId = new Map(localEntries.map((entry) => [entry.id, entry]))
      finance = {
        ...finance,
        rows: finance.rows.map((row) => {
          const local = byId.get(row.id)
          if (!local) return row
          return {
            ...row,
            expenseTitle: row.expenseTitle ?? local.expenseTitle,
            payeeIdentityNo: row.payeeIdentityNo ?? local.payeeIdentityNo,
            invoiceNo: row.invoiceNo ?? local.invoiceNo,
            notes: row.notes ?? local.notes,
            bankName: row.bankName ?? local.bankName,
            checkInstallments: row.checkInstallments ?? local.checkInstallments,
            incomeCategory: row.incomeCategory ?? local.incomeCategory,
            payerFirstName: row.payerFirstName ?? local.payerFirstName,
            payerLastName: row.payerLastName ?? local.payerLastName,
            payerIdentityNo: row.payerIdentityNo ?? local.payerIdentityNo,
          }
        }),
      }
    }
  }

  return NextResponse.json({
    academicYear: activeYear,
    registrations: {
      total: newRegistrationCount + renewalCount,
      newRegistrations: newRegistrationCount,
      renewals: renewalCount,
    },
    finance,
    financeAvailable: Boolean(finance),
  })
}
