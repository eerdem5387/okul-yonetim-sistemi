import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkIbAccess } from "@/lib/access-control"
import { ActivityType, ActivityVerificationStatus } from "@prisma/client"

export interface ActivityStatsResponse {
  total: number
  thisYear: number
  verified: number
  unverified: number
  /** Doğrulama protokolü: 3 aşama sayıları */
  imzaSurecinde: number
  onayBekliyor: number
  onaylandi: number
  byType: Record<ActivityType, number>
  byCategory: Record<string, number> // egitim, etkinlik, spor, yarisma
  topStudents: Array<{
    studentId: string
    fullName: string
    grade: string
    tcNumber: string
    count: number
  }>
}

const ACTIVITY_TYPES: ActivityType[] = [
  "ETKINLIK",
  "GEZI",
  "PROJE",
  "SINAV",
  "YARISMA",
  "SEMINER",
  "WORKSHOP",
  "SPORT",
  "SANAT",
  "SOSYAL",
  "DIL",
  "BILIM",
  "DEGER",
  "DIGER",
]

export async function GET(request: NextRequest) {
  const { hasAccess } = await checkIbAccess(request)
  if (!hasAccess) {
    return NextResponse.json({ error: "Bu işlem için yetkiniz bulunmamaktadır" }, { status: 403 })
  }

  try {
    const now = new Date()
    const yearStart = new Date(now.getFullYear(), 0, 1)
    const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)

    const [total, thisYear, verified, unverified, groupByType, groupByCategory, topByStudent] = await Promise.all([
      prisma.activity.count(),
      prisma.activity.count({ where: { activityDate: { gte: yearStart, lte: yearEnd } } }),
      prisma.activity.count({ where: { isVerified: true } }),
      prisma.activity.count({ where: { isVerified: false } }),
      prisma.activity.groupBy({
        by: ["type"],
        _count: { type: true },
      }),
      prisma.activity.groupBy({
        by: ["category"],
        _count: { category: true },
        where: { category: { not: null } },
      }),
      prisma.activity.groupBy({
        by: ["studentId"],
        _count: { studentId: true },
        orderBy: { _count: { studentId: "desc" } },
        take: 50,
      }),
    ])

    let imzaSurecinde = 0
    let onayBekliyor = 0
    let onaylandi = 0
    try {
      const [imza, onayBek, onaylan] = await Promise.all([
        prisma.activity.count({ where: { verificationStatus: ActivityVerificationStatus.IMZA_SURECINDE } }),
        prisma.activity.count({ where: { verificationStatus: ActivityVerificationStatus.ONAY_BEKLIYOR } }),
        prisma.activity.count({ where: { verificationStatus: ActivityVerificationStatus.ONAYLANDI } }),
      ])
      imzaSurecinde = imza
      onayBekliyor = onayBek
      onaylandi = onaylan
    } catch {
      onaylandi = verified
      imzaSurecinde = unverified
    }

    const byType = ACTIVITY_TYPES.reduce<Record<ActivityType, number>>(
      (acc, t) => ({ ...acc, [t]: 0 }),
      {} as Record<ActivityType, number>
    )
    groupByType.forEach((row) => {
      byType[row.type] = row._count.type
    })

    const byCategory: Record<string, number> = { egitim: 0, etkinlik: 0, spor: 0, yarisma: 0 }
    groupByCategory.forEach((row) => {
      if (row.category) byCategory[row.category] = row._count.category
    })

    const studentIds = topByStudent.map((r) => r.studentId)
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, firstName: true, lastName: true, grade: true, tcNumber: true },
    })
    const studentMap = new Map(students.map((s) => [s.id, s]))

    const topStudents = topByStudent.map((row) => {
      const s = studentMap.get(row.studentId)
      return {
        studentId: row.studentId,
        fullName: s ? `${s.firstName} ${s.lastName}`.trim() : "Bilinmeyen",
        grade: s?.grade ?? "",
        tcNumber: s?.tcNumber ?? "",
        count: row._count.studentId,
      }
    })

    const body: ActivityStatsResponse = {
      total,
      thisYear,
      verified,
      unverified,
      imzaSurecinde,
      onayBekliyor,
      onaylandi,
      byType,
      byCategory,
      topStudents,
    }
    return NextResponse.json(body)
  } catch (error) {
    console.error("Error fetching activity stats:", error)
    return NextResponse.json({ error: "İstatistikler alınamadı" }, { status: 500 })
  }
}
