import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkActivityAccess } from "@/lib/access-control"

export async function GET(request: NextRequest) {
  const { hasAccess } = await checkActivityAccess(request)
  if (!hasAccess) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 })
  }

  try {
    const now = new Date()
    const yearStart = new Date(now.getFullYear(), 0, 1)
    const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)

    const [
      totalEvents,
      thisYearEvents,
      totalParticipants,
      byMainType,
      byVerificationStatus,
      topByStudent,
      recentEvents,
    ] = await Promise.all([
      prisma.activityEvent.count(),
      prisma.activityEvent.count({
        where: { startDate: { gte: yearStart, lte: yearEnd } },
      }),
      prisma.activityParticipant.count(),
      prisma.activityEvent.groupBy({
        by: ["mainType"],
        _count: { id: true },
      }),
      prisma.activityParticipant.groupBy({
        by: ["verificationStatus"],
        _count: { id: true },
      }),
      prisma.activityParticipant.groupBy({
        by: ["studentId"],
        _count: { studentId: true },
        orderBy: { _count: { studentId: "desc" } },
        take: 50,
      }),
      prisma.activityEvent.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          teacher: { select: { firstName: true, lastName: true } },
          _count: { select: { participants: true } },
        },
      }),
    ])

    const byMainTypeMap: Record<string, number> = {}
    const byCategory: Record<string, number> = {
      egitim: 0,
      etkinlik: 0,
      spor: 0,
      yarisma: 0,
    }
    for (const item of byMainType) {
      byMainTypeMap[item.mainType] = item._count.id
      if (item.mainType === "EGITIM") byCategory.egitim += item._count.id
      else if (item.mainType === "SPOR") byCategory.spor += item._count.id
      else if (item.mainType === "TURNUVA") byCategory.yarisma += item._count.id
      else byCategory.etkinlik += item._count.id
    }

    const verificationMap: Record<string, number> = {
      IMZA_SURECINDE: 0,
      ONAY_BEKLIYOR: 0,
      ONAYLANDI: 0,
    }
    for (const item of byVerificationStatus) {
      verificationMap[item.verificationStatus] = item._count.id
    }

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

    return NextResponse.json({
      // Dashboard uyumluluğu (legacy alan adları)
      total: totalEvents,
      thisYear: thisYearEvents,
      verified: verificationMap.ONAYLANDI,
      unverified: verificationMap.IMZA_SURECINDE + verificationMap.ONAY_BEKLIYOR,
      imzaSurecinde: verificationMap.IMZA_SURECINDE,
      onayBekliyor: verificationMap.ONAY_BEKLIYOR,
      onaylandi: verificationMap.ONAYLANDI,
      byCategory,
      topStudents,
      // Yeni endpoint alanları (geriye uyum için tutuldu)
      totalEvents,
      totalParticipants,
      byMainType: byMainTypeMap,
      verification: verificationMap,
      recentEvents,
    })
  } catch (error) {
    console.error("GET /api/activity-events/stats error:", error)
    return NextResponse.json({ error: "İstatistikler yüklenirken hata oluştu" }, { status: 500 })
  }
}
