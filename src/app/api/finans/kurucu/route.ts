import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveStaffActor } from "@/lib/hr/actor"
import { canViewFinance } from "@/lib/finance/access"
import { fetchMuhasebeFinanceSummary } from "@/lib/finance/muhasebe-sync"
import { contractMatchesAcademicYearTargets } from "@/lib/student-registration-meta"

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

  const targets = activeYear ? [{ id: activeYear.id, label: activeYear.name }] : []
  const [newRegs, renewals] = await Promise.all([
    prisma.newRegistration.findMany({ select: { contractData: true } }),
    prisma.renewal.findMany({ select: { contractData: true } }),
  ])
  const newRegistrationCount = targets.length
    ? newRegs.filter((row) => contractMatchesAcademicYearTargets(row.contractData, targets)).length
    : 0
  const renewalCount = targets.length
    ? renewals.filter((row) => contractMatchesAcademicYearTargets(row.contractData, targets)).length
    : 0

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
