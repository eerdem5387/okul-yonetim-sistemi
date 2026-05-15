import type { LeaveType, LeaveStatus, Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export interface LeaveFilter {
  staffId?: string
  status?: LeaveStatus
  from?: Date
  to?: Date
}

export async function listLeaves(filter: LeaveFilter = {}) {
  const where: Prisma.StaffLeaveWhereInput = {}
  if (filter.staffId) where.staffId = filter.staffId
  if (filter.status) where.status = filter.status
  if (filter.from || filter.to) {
    where.AND = []
    if (filter.to) where.AND.push({ startDate: { lte: filter.to } })
    if (filter.from) where.AND.push({ endDate: { gte: filter.from } })
  }
  return prisma.staffLeave.findMany({
    where,
    include: {
      staff: {
        select: { id: true, firstName: true, lastName: true, department: true, subject: true },
      },
      approvedBy: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
  })
}

export async function getLeaveById(id: string) {
  return prisma.staffLeave.findUnique({
    where: { id },
    include: {
      staff: { select: { id: true, firstName: true, lastName: true, department: true } },
    },
  })
}

export interface CreateLeaveInput {
  staffId: string
  type: LeaveType
  startDate: Date
  endDate: Date
  reason?: string | null
}

export async function createLeave(input: CreateLeaveInput) {
  if (input.endDate.getTime() < input.startDate.getTime()) {
    throw new Error("Bitiş tarihi başlangıçtan önce olamaz")
  }
  return prisma.staffLeave.create({
    data: {
      staffId: input.staffId,
      type: input.type,
      startDate: input.startDate,
      endDate: input.endDate,
      reason: input.reason ?? null,
    },
  })
}

export interface DecideLeaveInput {
  leaveId: string
  approverId: string
  decision: "APPROVE" | "REJECT"
  decisionNote?: string | null
}

export async function decideLeave(input: DecideLeaveInput) {
  const now = new Date()
  return prisma.staffLeave.update({
    where: { id: input.leaveId },
    data:
      input.decision === "APPROVE"
        ? {
            status: "APPROVED",
            approvedById: input.approverId,
            approvedAt: now,
            rejectedAt: null,
            decisionNote: input.decisionNote ?? null,
          }
        : {
            status: "REJECTED",
            approvedById: input.approverId,
            rejectedAt: now,
            approvedAt: null,
            decisionNote: input.decisionNote ?? null,
          },
  })
}

export async function deleteLeave(leaveId: string) {
  return prisma.staffLeave.delete({ where: { id: leaveId } })
}

/**
 * Belirtilen izin için, kapsadığı her gün için ilgili personelin haftalık ders programındaki
 * ders sayısını döner. Boş array → çakışma yok.
 */
export async function getLeaveScheduleConflicts(leaveId: string) {
  const leave = await prisma.staffLeave.findUnique({
    where: { id: leaveId },
    select: { id: true, staffId: true, startDate: true, endDate: true },
  })
  if (!leave) return null

  return getStaffScheduleConflicts(leave.staffId, leave.startDate, leave.endDate)
}

export async function getStaffScheduleConflicts(staffId: string, startDate: Date, endDate: Date) {
  const dayConflicts: Array<{
    date: string
    dayOfWeek: number
    schedules: Array<{
      id: string
      subjectName: string
      startTime: string
      endTime: string
      room: string | null
      className: string
    }>
  }> = []

  const cursor = new Date(startDate)
  cursor.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)

  while (cursor.getTime() <= end.getTime()) {
    const jsDow = cursor.getDay() // 0 = Pazar
    const dayOfWeek = jsDow === 0 ? 7 : jsDow
    const schedules = await prisma.schedule.findMany({
      where: { teacherId: staffId, dayOfWeek, isActive: true },
      select: {
        id: true,
        subjectName: true,
        startTime: true,
        endTime: true,
        room: true,
        class: { select: { name: true } },
      },
      orderBy: { startTime: "asc" },
    })
    if (schedules.length > 0) {
      dayConflicts.push({
        date: cursor.toISOString().slice(0, 10),
        dayOfWeek,
        schedules: schedules.map((s) => ({
          id: s.id,
          subjectName: s.subjectName,
          startTime: s.startTime,
          endTime: s.endTime,
          room: s.room,
          className: s.class.name,
        })),
      })
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return dayConflicts
}

/**
 * Bugün izinli personeli ve etkilenen ders sayısını dashboard için döner.
 */
export async function getTodayLeaveSummary() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const onLeave = await prisma.staffLeave.findMany({
    where: {
      status: "APPROVED",
      startDate: { lt: tomorrow },
      endDate: { gte: today },
    },
    include: {
      staff: { select: { id: true, firstName: true, lastName: true, department: true } },
    },
  })
  return onLeave
}
