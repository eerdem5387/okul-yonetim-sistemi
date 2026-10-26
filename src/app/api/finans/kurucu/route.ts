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

  return NextResponse.json({
    academicYear: activeYear,
    registrations: {
      total: newRegistrationCount + renewalCount,
      newRegistrations: newRegistrationCount,
      renewals: renewalCount,
    },
    finance: live?.founder ?? null,
    financeAvailable: Boolean(live?.founder),
  })
}
