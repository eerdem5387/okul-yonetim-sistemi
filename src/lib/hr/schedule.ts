import { prisma } from "@/lib/prisma"

export interface WeeklyScheduleItem {
  id: string
  classId: string
  className: string
  subjectName: string
  dayOfWeek: number
  startTime: string
  endTime: string
  room: string | null
  notes: string | null
}

export async function getWeeklyScheduleForStaff(staffId: string): Promise<WeeklyScheduleItem[]> {
  const items = await prisma.schedule.findMany({
    where: { teacherId: staffId, isActive: true },
    include: { class: { select: { id: true, name: true } } },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  })
  return items.map((s) => ({
    id: s.id,
    classId: s.classId,
    className: s.class.name,
    subjectName: s.subjectName,
    dayOfWeek: s.dayOfWeek,
    startTime: s.startTime,
    endTime: s.endTime,
    room: s.room,
    notes: s.notes,
  }))
}

/**
 * Şu an (sunucu saati) ders veren personeli sayar.
 * Schedule.startTime / endTime "HH:mm" formatında string'tir.
 */
export async function countStaffInClassNow(): Promise<number> {
  const now = new Date()
  const jsDow = now.getDay()
  const dayOfWeek = jsDow === 0 ? 7 : jsDow
  const hh = String(now.getHours()).padStart(2, "0")
  const mm = String(now.getMinutes()).padStart(2, "0")
  const current = `${hh}:${mm}`

  const rows = await prisma.schedule.findMany({
    where: {
      isActive: true,
      dayOfWeek,
      startTime: { lte: current },
      endTime: { gte: current },
    },
    select: { teacherId: true },
  })
  return new Set(rows.map((r) => r.teacherId)).size
}
