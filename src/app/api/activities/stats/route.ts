import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkIbAccess } from "@/lib/access-control"
import type { ActivityType } from "@prisma/client"

export interface ActivityStatsResponse {
  total: number
  byType: Record<ActivityType, number>
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
    const [total, groupByType, topByStudent] = await Promise.all([
      prisma.activity.count(),
      prisma.activity.groupBy({
        by: ["type"],
        _count: { type: true },
      }),
      prisma.activity.groupBy({
        by: ["studentId"],
        _count: { studentId: true },
        orderBy: { _count: { studentId: "desc" } },
        take: 50,
      }),
    ])

    const byType = ACTIVITY_TYPES.reduce<Record<ActivityType, number>>(
      (acc, t) => ({ ...acc, [t]: 0 }),
      {} as Record<ActivityType, number>
    )
    groupByType.forEach((row) => {
      byType[row.type] = row._count.type
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

    const body: ActivityStatsResponse = { total, byType, topStudents }
    return NextResponse.json(body)
  } catch (error) {
    console.error("Error fetching activity stats:", error)
    return NextResponse.json({ error: "İstatistikler alınamadı" }, { status: 500 })
  }
}
