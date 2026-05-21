import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkActivityStaffStatsAccess } from "@/lib/access-control"
import { STAFF_DEPARTMENT_LABELS } from "@/lib/hr/constants"
import { MAIN_TYPE_LABELS } from "@/lib/activity-types-config"
import type { ActivityMainType, ActivityVerificationStatus, StaffDepartment } from "@prisma/client"

function aggregateStatuses(statuses: ActivityVerificationStatus[]): ActivityVerificationStatus {
  if (statuses.length === 0) return "IMZA_SURECINDE"
  if (statuses.some((s) => s === "ONAY_BEKLIYOR")) return "ONAY_BEKLIYOR"
  if (statuses.every((s) => s === "ONAYLANDI")) return "ONAYLANDI"
  return "IMZA_SURECINDE"
}

function yearBounds(yearParam: string | null): { start: Date; end: Date } | null {
  if (!yearParam) return null
  const y = parseInt(yearParam, 10)
  if (!Number.isFinite(y) || y < 2000 || y > 2100) return null
  return {
    start: new Date(y, 0, 1),
    end: new Date(y, 11, 31, 23, 59, 59, 999),
  }
}

export async function GET(request: NextRequest) {
  const { hasAccess } = await checkActivityStaffStatsAccess(request)
  if (!hasAccess) {
    return NextResponse.json(
      {
        error:
          "Personel faaliyet istatistiklerini görüntüleme yetkiniz yok. Sistem yöneticisinden «Personel Faaliyet İstatistikleri» iznini talep edin.",
      },
      { status: 403 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const staffIdParam = searchParams.get("staffId") || ""
    const department = searchParams.get("department") || ""
    const search = (searchParams.get("search") || "").trim().toLowerCase()
    const yearParam = searchParams.get("year") || ""
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(50, parseInt(searchParams.get("limit") || "20", 10))
    const topLimit = Math.min(20, parseInt(searchParams.get("top") || "0", 10))

    const yearBoundsFilter = yearBounds(yearParam)
    const now = new Date()
    const thisYearStart = new Date(now.getFullYear(), 0, 1)

    if (staffIdParam) {
      const staff = await prisma.staff.findUnique({
        where: { id: staffIdParam },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          department: true,
          isActive: true,
        },
      })
      if (!staff) {
        return NextResponse.json({ error: "Personel bulunamadı" }, { status: 404 })
      }

      const eventWhere = {
        teacherId: staffIdParam,
        ...(yearBoundsFilter
          ? { createdAt: { gte: yearBoundsFilter.start, lte: yearBoundsFilter.end } }
          : {}),
      }

      const [total, events] = await Promise.all([
        prisma.activityEvent.count({ where: eventWhere }),
        prisma.activityEvent.findMany({
          where: eventWhere,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            teacher: { select: { firstName: true, lastName: true } },
            participants: { select: { verificationStatus: true } },
          },
        }),
      ])

      const creatorIds = [
        ...new Set(events.map((e) => e.createdBy).filter((id) => id && id !== "unknown")),
      ]
      const creators =
        creatorIds.length > 0
          ? await prisma.staff.findMany({
              where: { id: { in: creatorIds } },
              select: { id: true, firstName: true, lastName: true },
            })
          : []
      const creatorMap = new Map(creators.map((c) => [c.id, `${c.firstName} ${c.lastName}`.trim()]))

      const activities = events.map((e) => {
        const st = e.participants.map((p) => p.verificationStatus)
        const creatorName = creatorMap.get(e.createdBy) ?? (e.createdBy === "unknown" ? null : e.createdBy)
        return {
          id: e.id,
          title: e.title,
          mainType: e.mainType,
          mainTypeLabel: MAIN_TYPE_LABELS[e.mainType as ActivityMainType] ?? e.mainType,
          subtype: e.subtype,
          participantCount: e.participants.length,
          verificationStatus: aggregateStatuses(st),
          createdAt: e.createdAt.toISOString(),
          startDate: e.startDate.toISOString(),
          endDate: e.endDate.toISOString(),
          organizerName: e.organizerName,
          teacherName: `${e.teacher.firstName} ${e.teacher.lastName}`.trim(),
          createdById: e.createdBy,
          createdByName: creatorName,
          detailHref: `/faaliyet-yonetimi/${e.id}`,
        }
      })

      const allForStaff = await prisma.activityEvent.findMany({
        where: { teacherId: staffIdParam },
        select: {
          mainType: true,
          createdAt: true,
          _count: { select: { participants: true } },
        },
      })

      let activityCount = 0
      let participantCount = 0
      let thisYearCount = 0
      const byMainType: Record<string, number> = {}
      let lastCreatedAt: string | null = null

      for (const e of allForStaff) {
        activityCount++
        participantCount += e._count.participants
        if (e.createdAt >= thisYearStart) thisYearCount++
        byMainType[e.mainType] = (byMainType[e.mainType] ?? 0) + 1
        if (!lastCreatedAt || e.createdAt > new Date(lastCreatedAt)) {
          lastCreatedAt = e.createdAt.toISOString()
        }
      }

      return NextResponse.json({
        staff: {
          staffId: staff.id,
          fullName: `${staff.firstName} ${staff.lastName}`.trim(),
          department: staff.department,
          departmentLabel: STAFF_DEPARTMENT_LABELS[staff.department] ?? staff.department,
          activityCount,
          participantCount,
          thisYearCount,
          lastCreatedAt,
          byMainType,
        },
        activities,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      })
    }

    const listWhere = {
      ...(yearBoundsFilter
        ? { createdAt: { gte: yearBoundsFilter.start, lte: yearBoundsFilter.end } }
        : {}),
    }

    const events = await prisma.activityEvent.findMany({
      where: Object.keys(listWhere).length > 0 ? listWhere : undefined,
      select: {
        teacherId: true,
        mainType: true,
        createdAt: true,
        createdBy: true,
        _count: { select: { participants: true } },
      },
    })

    const agg = new Map<
      string,
      {
        activityCount: number
        participantCount: number
        thisYearCount: number
        byMainType: Record<string, number>
        lastCreatedAt: Date | null
        createdByIds: Set<string>
      }
    >()

    for (const e of events) {
      const tid = e.teacherId
      let row = agg.get(tid)
      if (!row) {
        row = {
          activityCount: 0,
          participantCount: 0,
          thisYearCount: 0,
          byMainType: {},
          lastCreatedAt: null,
          createdByIds: new Set(),
        }
        agg.set(tid, row)
      }
      row.activityCount++
      row.participantCount += e._count.participants
      if (e.createdAt >= thisYearStart) row.thisYearCount++
      row.byMainType[e.mainType] = (row.byMainType[e.mainType] ?? 0) + 1
      if (!row.lastCreatedAt || e.createdAt > row.lastCreatedAt) row.lastCreatedAt = e.createdAt
      if (e.createdBy && e.createdBy !== "unknown") row.createdByIds.add(e.createdBy)
    }

    const teacherIds = [...agg.keys()]
    const staffRows = await prisma.staff.findMany({
      where: { id: { in: teacherIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        department: true,
        isActive: true,
      },
    })
    const staffMap = new Map(staffRows.map((s) => [s.id, s]))

    let staffList = teacherIds
      .map((id) => {
        const s = staffMap.get(id)
        const a = agg.get(id)!
        if (!s) return null
        return {
          staffId: id,
          fullName: `${s.firstName} ${s.lastName}`.trim(),
          department: s.department,
          departmentLabel: STAFF_DEPARTMENT_LABELS[s.department as StaffDepartment] ?? s.department,
          isActive: s.isActive,
          activityCount: a.activityCount,
          participantCount: a.participantCount,
          thisYearCount: a.thisYearCount,
          lastCreatedAt: a.lastCreatedAt?.toISOString() ?? null,
          byMainType: a.byMainType,
          distinctCreators: a.createdByIds.size,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)

    if (department) {
      staffList = staffList.filter((s) => s.department === department)
    }
    if (search) {
      staffList = staffList.filter(
        (s) =>
          s.fullName.toLowerCase().includes(search) ||
          s.departmentLabel.toLowerCase().includes(search)
      )
    }

    staffList.sort((a, b) => b.activityCount - a.activityCount)

    const summary = {
      totalActivities: events.length,
      staffWithEntries: staffList.length,
      totalParticipants: staffList.reduce((sum, s) => sum + s.participantCount, 0),
      thisYearActivities: events.filter((e) => e.createdAt >= thisYearStart).length,
    }

    const sliced = topLimit > 0 ? staffList.slice(0, topLimit) : staffList

    return NextResponse.json({
      summary,
      staff: sliced,
      availableYears: buildAvailableYears(),
    })
  } catch (error) {
    console.error("GET /api/ib-dashboard/personel-istatistik error:", error)
    return NextResponse.json({ error: "Personel istatistikleri alınamadı" }, { status: 500 })
  }
}

function buildAvailableYears(): number[] {
  const current = new Date().getFullYear()
  const years: number[] = []
  for (let y = current; y >= current - 5; y--) years.push(y)
  return years
}
