import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkIbAccess } from "@/lib/access-control"
import {
  ActivityMainType,
  ActivityType,
  ActivityVerificationStatus,
  Prisma,
} from "@prisma/client"
import { MAIN_TYPE_LABELS } from "@/lib/activity-types-config"

type UnifiedSource = "event" | "legacy_group"

export interface UnifiedFaaliyetListItem {
  source: UnifiedSource
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

const TYPE_LABELS: Record<ActivityType, string> = {
  ETKINLIK: "Etkinlik",
  GEZI: "Gezi",
  PROJE: "Proje",
  SINAV: "Sınav",
  YARISMA: "Yarışma",
  SEMINER: "Seminer",
  WORKSHOP: "Workshop",
  SPORT: "Spor",
  SANAT: "Sanat",
  SOSYAL: "Sosyal",
  DIL: "Dil",
  BILIM: "Bilim",
  DEGER: "Değerler",
  DIGER: "Diğer",
}

const CATEGORY_LABELS: Record<string, string> = {
  egitim: "Eğitim",
  etkinlik: "Etkinlik",
  spor: "Spor",
  yarisma: "Yarışma",
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
    const type = searchParams.get("type") || ""
    const category = searchParams.get("category") || ""
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

    const andL: Prisma.ActivityWhereInput[] = []

    if (type) andL.push({ type: type as ActivityType })
    if (category && ["egitim", "etkinlik", "spor", "yarisma"].includes(category)) {
      andL.push({ category })
    }
    if (search) {
      andL.push({
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { location: { contains: search, mode: "insensitive" } },
        ],
      })
    }
    if (startDate) {
      andL.push({ activityDate: { gte: new Date(startDate) } })
    }
    if (endDate) {
      andL.push({ activityDate: { lte: new Date(endDate) } })
    }

    const legacyRows = await prisma.activity.findMany({
      where: andL.length ? { AND: andL } : undefined,
      orderBy: { activityDate: "desc" },
      take: 2000,
      select: {
        id: true,
        studentId: true,
        title: true,
        type: true,
        category: true,
        activityDate: true,
        verificationStatus: true,
        organizer: true,
      },
    })

    type LegacyAgg = {
      anchorId: string
      title: string
      type: ActivityType
      category: string | null
      dayKey: string
      lastDate: Date
      statuses: ActivityVerificationStatus[]
      count: number
      studentIds: Set<string>
    }

    const legacyMap = new Map<string, LegacyAgg>()

    for (const row of legacyRows) {
      const dayKey = row.activityDate.toISOString().slice(0, 10)
      const cat = row.category ?? ""
      const key = `${row.title}\0${row.type}\0${cat}\0${dayKey}`
      const cur = legacyMap.get(key)
      if (!cur) {
        legacyMap.set(key, {
          anchorId: row.id,
          title: row.title,
          type: row.type,
          category: row.category,
          dayKey,
          lastDate: row.activityDate,
          statuses: [row.verificationStatus],
          count: 1,
          studentIds: new Set([row.studentId]),
        })
      } else {
        cur.count += 1
        cur.statuses.push(row.verificationStatus)
        cur.studentIds.add(row.studentId)
        if (row.activityDate > cur.lastDate) cur.lastDate = row.activityDate
        if (row.id < cur.anchorId) cur.anchorId = row.id
      }
    }

    let legacyItems: UnifiedFaaliyetListItem[] = [...legacyMap.values()]
      .filter((g) => !studentId || g.studentIds.has(studentId))
      .map((g) => ({
        source: "legacy_group" as const,
        id: `legacy:${g.anchorId}`,
        title: g.title,
        sortDate: g.lastDate.toISOString(),
        participantCount: g.count,
        verificationStatus: aggregateStatuses(g.statuses),
        detailHref: `/activities/grup/${g.anchorId}`,
        teacherOrOrganizer: null,
        typeLabel: TYPE_LABELS[g.type] ?? g.type,
        categoryLabel: g.category ? CATEGORY_LABELS[g.category] ?? g.category : null,
      }))

    let eventItems: UnifiedFaaliyetListItem[] = events.map((e) => {
      const st = e.participants.map((p) => p.verificationStatus)
      return {
        source: "event" as const,
        id: e.id,
        title: e.title,
        sortDate: e.startDate.toISOString(),
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
      legacyItems = legacyItems.filter((i) => i.verificationStatus === v)
      eventItems = eventItems.filter((i) => i.verificationStatus === v)
    }

    const merged = [...eventItems, ...legacyItems].sort(
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
