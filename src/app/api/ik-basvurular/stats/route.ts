import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireHrRecruitmentAccess } from "@/lib/hr-recruitment/access"

export async function GET(request: NextRequest) {
  const gate = await requireHrRecruitmentAccess(request, "view")
  if (gate.response) return gate.response

  try {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(startOfToday)
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [total, today, thisWeek, thisMonth, byStatus, byBranch] = await Promise.all([
      prisma.hrJobApplication.count(),
      prisma.hrJobApplication.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.hrJobApplication.count({ where: { createdAt: { gte: startOfWeek } } }),
      prisma.hrJobApplication.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.hrJobApplication.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.hrJobApplication.groupBy({
        by: ["appliedBranch"],
        _count: { _all: true },
      }),
    ])

    const topBranches = byBranch
      .sort((a, b) => b._count._all - a._count._all)
      .slice(0, 8)
      .map((b) => ({ branch: b.appliedBranch, count: b._count._all }))

    return NextResponse.json({
      total,
      today,
      thisWeek,
      thisMonth,
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])),
      topBranches,
    })
  } catch (error) {
    console.error("[ik-basvurular/stats] error:", error)
    return NextResponse.json({ error: "İstatistikler yüklenemedi" }, { status: 500 })
  }
}
