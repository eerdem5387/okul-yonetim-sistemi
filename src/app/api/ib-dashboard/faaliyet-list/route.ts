import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkIbAccess } from "@/lib/access-control"
import { ActivityMainType, ActivityVerificationStatus, Prisma } from "@prisma/client"
import { MAIN_TYPE_LABELS } from "@/lib/activity-types-config"

export interface UnifiedFaaliyetListItem {
  source: "event"
  id: string
  title: string
  sortDate: string
  participantCount: number
  verificationStatus: ActivityVerificationStatus
  detailHref: string
  teacherOrOrganizer: string | null
  typeLabel: string
  categoryLabel: string | null
}

function aggregateStatuses(statuses: ActivityVerificationStatus[]): ActivityVerificationStatus {
  if (statuses.length === 0) return ActivityVerificationStatus.IMZA_SURECINDE
  if (statuses.some((s) => s === ActivityVerificationStatus.ONAY_BEKLIYOR)) {
    return ActivityVerificationStatus.ONAY_BEKLIYOR
  }
  if (statuses.every((s) => s === ActivityVerificationStatus.ONAYLANDI)) {
    return ActivityVerificationStatus.ONAYLANDI
  }
  return ActivityVerificationStatus.IMZA_SURECINDE
}

export async function GET(request: NextRequest) {
  const { hasAccess } = await checkIbAccess(request)
  if (!hasAccess) {
    return NextResponse.json({ error: "Bu işlem için yetkiniz bulunmamaktadır" }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(50, parseInt(searchParams.get("limit") || "20", 10))
    const studentId = searchParams.get("studentId") || ""
    const search = searchParams.get("search") || ""
    const startDate = searchParams.get("startDate") || ""
    const endDate = searchParams.get("endDate") || ""
    const verificationStatus = searchParams.get("verificationStatus") || ""
    const mainType = searchParams.get("mainType") || ""

    const andE: Prisma.ActivityEventWhereInput[] = []

    if (mainType && mainType !== "ALL") {
      andE.push({ mainType: mainType as ActivityMainType })
    }
    if (search) {
      andE.push({
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { organizerName: { contains: search, mode: "insensitive" } },
        ],
      })
    }
    if (startDate) {
      andE.push({ startDate: { gte: new Date(startDate) } })
    }
    if (endDate) {
      andE.push({ endDate: { lte: new Date(endDate) } })
    }
    if (studentId) {
      andE.push({ participants: { some: { studentId } } })
    }

    const events = await prisma.activityEvent.findMany({
      where: andE.length ? { AND: andE } : undefined,
      include: {
        teacher: { select: { firstName: true, lastName: true } },
        participants: { select: { verificationStatus: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 800,
    })

    let eventItems: UnifiedFaaliyetListItem[] = events.map((e) => {
      const st = e.participants.map((p) => p.verificationStatus)
      return {
        source: "event",
        id: e.id,
        title: e.title,
        // Liste sıralaması için "oluşturulma tarihi" (createdAt) kullanılmalı.
        sortDate: e.createdAt.toISOString(),
        participantCount: e.participants.length,
        verificationStatus: aggregateStatuses(st),
        detailHref: `/faaliyet-yonetimi/${e.id}`,
        teacherOrOrganizer: `${e.teacher.firstName} ${e.teacher.lastName}`,
        typeLabel: MAIN_TYPE_LABELS[e.mainType] ?? e.mainType,
        categoryLabel: e.subtype ?? null,
      }
    })

    if (
      verificationStatus === "IMZA_SURECINDE" ||
      verificationStatus === "ONAY_BEKLIYOR" ||
      verificationStatus === "ONAYLANDI"
    ) {
      const v = verificationStatus as ActivityVerificationStatus
      eventItems = eventItems.filter((i) => i.verificationStatus === v)
    }

    const merged = [...eventItems].sort(
      (a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime()
    )

    const total = merged.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const slice = merged.slice((page - 1) * limit, page * limit)

    return NextResponse.json({
      items: slice,
      pagination: { page, limit, total, totalPages },
    })
  } catch (error) {
    console.error("GET /api/ib-dashboard/faaliyet-list error:", error)
    return NextResponse.json({ error: "Liste alınamadı" }, { status: 500 })
  }
}
