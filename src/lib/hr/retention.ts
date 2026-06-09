import type { Prisma, StaffDepartment, StaffRetentionOutcome } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getRenewalTargetYear } from "@/lib/academic-year-contract-server"

export const RETENTION_OUTCOME_LABELS: Record<StaffRetentionOutcome, string> = {
  WILL_CONTINUE: "Devam Edecek",
  UNCERTAIN: "Belirsiz",
  WILL_NOT_CONTINUE: "Devam Etmeyecek",
}

export const RETENTION_OUTCOMES: StaffRetentionOutcome[] = [
  "WILL_CONTINUE",
  "UNCERTAIN",
  "WILL_NOT_CONTINUE",
]

const cycleInclude = {
  staff: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      department: true,
      subject: true,
      position: true,
      isActive: true,
    },
  },
  meetings: {
    orderBy: { meetingAt: "desc" as const },
    include: {
      conductedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  },
} satisfies Prisma.StaffRetentionCycleInclude

export type RetentionCycleWithRelations = Prisma.StaffRetentionCycleGetPayload<{
  include: typeof cycleInclude
}>

export async function getDefaultTargetYear() {
  return getRenewalTargetYear()
}

export interface RetentionListFilter {
  staffId?: string
  targetAcademicYearLabel?: string
  outcome?: StaffRetentionOutcome | "NO_MEETING"
  department?: StaffDepartment
  search?: string
  activeOnly?: boolean
}

export async function listRetentionOverview(filter: RetentionListFilter = {}) {
  const targetYear =
    filter.targetAcademicYearLabel ?? (await getDefaultTargetYear())?.label ?? null

  const staffWhere: Prisma.StaffWhereInput = {}
  if (filter.activeOnly !== false) staffWhere.isActive = true
  if (filter.department) staffWhere.department = filter.department
  if (filter.staffId) staffWhere.id = filter.staffId
  if (filter.search?.trim()) {
    const q = filter.search.trim()
    staffWhere.OR = [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { subject: { contains: q, mode: "insensitive" } },
    ]
  }

  const staffList = await prisma.staff.findMany({
    where: staffWhere,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      department: true,
      subject: true,
      position: true,
      isActive: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  })

  const cycles = targetYear
    ? await prisma.staffRetentionCycle.findMany({
        where: {
          targetAcademicYearLabel: targetYear,
          ...(filter.staffId ? { staffId: filter.staffId } : {}),
        },
        include: {
          meetings: {
            orderBy: { meetingAt: "desc" },
            take: 1,
            include: {
              conductedBy: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
      })
    : []

  const cycleByStaffId = new Map(cycles.map((c) => [c.staffId, c]))

  let rows = staffList.map((staff) => {
    const cycle = cycleByStaffId.get(staff.id)
    const lastMeeting = cycle?.meetings[0] ?? null
    return {
      staff,
      cycle: cycle
        ? {
            id: cycle.id,
            targetAcademicYearId: cycle.targetAcademicYearId,
            targetAcademicYearLabel: cycle.targetAcademicYearLabel,
            currentOutcome: cycle.currentOutcome,
            lastMeetingAt: cycle.lastMeetingAt,
          }
        : null,
      lastMeeting,
      hasMeeting: Boolean(lastMeeting),
    }
  })

  if (filter.outcome === "NO_MEETING") {
    rows = rows.filter((r) => !r.hasMeeting)
  } else if (filter.outcome) {
    rows = rows.filter((r) => r.cycle?.currentOutcome === filter.outcome)
  }

  const stats = {
    total: rows.length,
    willContinue: rows.filter((r) => r.cycle?.currentOutcome === "WILL_CONTINUE").length,
    uncertain: rows.filter((r) => r.cycle?.currentOutcome === "UNCERTAIN").length,
    willNotContinue: rows.filter((r) => r.cycle?.currentOutcome === "WILL_NOT_CONTINUE").length,
    noMeeting: rows.filter((r) => !r.hasMeeting).length,
  }

  return { targetYear, rows, stats }
}

export async function getRetentionCycleByStaff(
  staffId: string,
  targetAcademicYearLabel?: string
): Promise<RetentionCycleWithRelations | null> {
  const label =
    targetAcademicYearLabel ?? (await getDefaultTargetYear())?.label ?? undefined
  if (!label) return null

  return prisma.staffRetentionCycle.findUnique({
    where: {
      staffId_targetAcademicYearLabel: { staffId, targetAcademicYearLabel: label },
    },
    include: cycleInclude,
  })
}

export interface CreateRetentionMeetingInput {
  staffId: string
  meetingAt: Date
  outcome: StaffRetentionOutcome
  notes?: string | null
  conductedById: string
  targetAcademicYearId?: string | null
  targetAcademicYearLabel?: string
}

export async function createRetentionMeeting(input: CreateRetentionMeetingInput) {
  const target = await getDefaultTargetYear()
  const label = input.targetAcademicYearLabel ?? target?.label
  const yearId = input.targetAcademicYearId ?? target?.id ?? null
  if (!label) throw new Error("Hedef akademik yıl tanımlı değil")

  return prisma.$transaction(async (tx) => {
    let cycle = await tx.staffRetentionCycle.findUnique({
      where: {
        staffId_targetAcademicYearLabel: {
          staffId: input.staffId,
          targetAcademicYearLabel: label,
        },
      },
    })

    if (!cycle) {
      cycle = await tx.staffRetentionCycle.create({
        data: {
          staffId: input.staffId,
          targetAcademicYearId: yearId,
          targetAcademicYearLabel: label,
        },
      })
    }

    const meeting = await tx.staffRetentionMeeting.create({
      data: {
        cycleId: cycle.id,
        meetingAt: input.meetingAt,
        outcome: input.outcome,
        notes: input.notes ?? null,
        conductedById: input.conductedById,
      },
      include: {
        conductedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    await tx.staffRetentionCycle.update({
      where: { id: cycle.id },
      data: {
        currentOutcome: input.outcome,
        lastMeetingAt: input.meetingAt,
        targetAcademicYearId: yearId ?? cycle.targetAcademicYearId,
      },
    })

    return { cycleId: cycle.id, meeting }
  })
}

export interface UpdateRetentionMeetingInput {
  meetingId: string
  meetingAt?: Date
  outcome?: StaffRetentionOutcome
  notes?: string | null
}

export async function updateRetentionMeeting(input: UpdateRetentionMeetingInput) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.staffRetentionMeeting.findUnique({
      where: { id: input.meetingId },
      include: { cycle: true },
    })
    if (!existing) throw new Error("Görüşme bulunamadı")

    const meeting = await tx.staffRetentionMeeting.update({
      where: { id: input.meetingId },
      data: {
        ...(input.meetingAt ? { meetingAt: input.meetingAt } : {}),
        ...(input.outcome ? { outcome: input.outcome } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
      include: {
        conductedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    const latest = await tx.staffRetentionMeeting.findFirst({
      where: { cycleId: existing.cycleId },
      orderBy: { meetingAt: "desc" },
    })

    if (latest) {
      await tx.staffRetentionCycle.update({
        where: { id: existing.cycleId },
        data: {
          currentOutcome: latest.outcome,
          lastMeetingAt: latest.meetingAt,
        },
      })
    } else {
      await tx.staffRetentionCycle.update({
        where: { id: existing.cycleId },
        data: { currentOutcome: null, lastMeetingAt: null },
      })
    }

    return meeting
  })
}

export async function deleteRetentionMeeting(meetingId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.staffRetentionMeeting.findUnique({
      where: { id: meetingId },
    })
    if (!existing) throw new Error("Görüşme bulunamadı")

    await tx.staffRetentionMeeting.delete({ where: { id: meetingId } })

    const latest = await tx.staffRetentionMeeting.findFirst({
      where: { cycleId: existing.cycleId },
      orderBy: { meetingAt: "desc" },
    })

    await tx.staffRetentionCycle.update({
      where: { id: existing.cycleId },
      data: {
        currentOutcome: latest?.outcome ?? null,
        lastMeetingAt: latest?.meetingAt ?? null,
      },
    })
  })
}

function countInclusiveDays(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())
  return Math.max(0, Math.floor((endUtc - startUtc) / msPerDay) + 1)
}

export async function getStaffDashboardData(staffId: string) {
  const [staff, leaves, scheduleItems, retentionCycle, targetYear] = await Promise.all([
    prisma.staff.findUnique({
      where: { id: staffId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        department: true,
        subject: true,
        isActive: true,
      },
    }),
    prisma.staffLeave.findMany({
      where: { staffId, status: "APPROVED" },
      orderBy: { startDate: "desc" },
    }),
    prisma.schedule.findMany({
      where: { teacherId: staffId, isActive: true },
      select: { dayOfWeek: true, startTime: true, endTime: true },
    }),
    getRetentionCycleByStaff(staffId),
    getDefaultTargetYear(),
  ])

  if (!staff) return null

  let reportedDays = 0
  let nonReportedDays = 0
  let pendingCount = 0

  const allLeaves = await prisma.staffLeave.findMany({ where: { staffId } })
  for (const leave of allLeaves) {
    if (leave.status === "PENDING") pendingCount++
    if (leave.status !== "APPROVED") continue
    const days = countInclusiveDays(leave.startDate, leave.endDate)
    if (leave.type === "SICK_REPORT") reportedDays += days
    else nonReportedDays += days
  }

  const uniqueDays = new Set(scheduleItems.map((s) => s.dayOfWeek))
  const weeklyLessonCount = scheduleItems.length

  function parseMinutes(t: string): number {
    const [h, m] = t.split(":").map(Number)
    return (h || 0) * 60 + (m || 0)
  }

  let weeklyMinutes = 0
  for (const s of scheduleItems) {
    weeklyMinutes += Math.max(0, parseMinutes(s.endTime) - parseMinutes(s.startTime))
  }

  return {
    staff,
    targetYear,
    leaves: {
      reportedDays,
      nonReportedDays,
      totalApprovedDays: reportedDays + nonReportedDays,
      pendingCount,
    },
    schedule: {
      weeklyLessonCount,
      weeklyTeachingDays: uniqueDays.size,
      weeklyHours: Math.round((weeklyMinutes / 60) * 10) / 10,
    },
    retention: retentionCycle
      ? {
          cycleId: retentionCycle.id,
          targetAcademicYearLabel: retentionCycle.targetAcademicYearLabel,
          currentOutcome: retentionCycle.currentOutcome,
          lastMeetingAt: retentionCycle.lastMeetingAt,
          meetingCount: retentionCycle.meetings.length,
        }
      : {
          cycleId: null,
          targetAcademicYearLabel: targetYear?.label ?? null,
          currentOutcome: null,
          lastMeetingAt: null,
          meetingCount: 0,
        },
  }
}
