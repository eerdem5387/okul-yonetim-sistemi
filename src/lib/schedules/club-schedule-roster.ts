import { prisma } from "@/lib/prisma"
import { DAY_LABELS } from "@/lib/schedules/time-conflict"

const studentSelect = {
  id: true,
  firstName: true,
  lastName: true,
  grade: true,
} as const

export type ClubRosterStudent = {
  id: string
  firstName: string
  lastName: string
  grade: string
  note?: string | null
}

export type ClubScheduleRoster = {
  schedule: {
    id: string
    dayOfWeek: number
    dayLabel: string
    startTime: string
    endTime: string
    room: string | null
    clubId: string
    clubName: string
    clubGroupId: string | null
    clubGroupName: string | null
  }
  /** Bu saatte gelenler (grup üyesi − muaf) */
  active: ClubRosterStudent[]
  /** Bu saatten muaf tutulanlar (grup üyeliği devam) */
  excluded: ClubRosterStudent[]
  /** Kulübe başvurmuş ama bu grupta olmayanlar */
  applicantsNotInGroup: ClubRosterStudent[]
}

export async function loadClubScheduleRoster(
  clubScheduleId: string
): Promise<{ roster: ClubScheduleRoster | null; error?: string }> {
  const schedule = await prisma.clubSchedule.findUnique({
    where: { id: clubScheduleId },
    include: {
      club: {
        select: {
          id: true,
          name: true,
          selections: {
            select: { student: { select: studentSelect } },
            orderBy: [
              { student: { lastName: "asc" } },
              { student: { firstName: "asc" } },
            ],
          },
        },
      },
      clubGroup: {
        select: {
          id: true,
          name: true,
          students: {
            select: { student: { select: studentSelect } },
            orderBy: [
              { student: { lastName: "asc" } },
              { student: { firstName: "asc" } },
            ],
          },
        },
      },
      exclusions: {
        select: {
          studentId: true,
          note: true,
          student: { select: studentSelect },
        },
        orderBy: [
          { student: { lastName: "asc" } },
          { student: { firstName: "asc" } },
        ],
      },
    },
  })

  if (!schedule || !schedule.isActive) {
    return { roster: null, error: "Kulüp programı bulunamadı" }
  }

  const members = schedule.clubGroup
    ? schedule.clubGroup.students.map((m) => m.student)
    : schedule.club.selections.map((m) => m.student)

  const excludedIds = new Set(schedule.exclusions.map((e) => e.studentId))
  const memberIds = new Set(members.map((m) => m.id))

  const active = members.filter((s) => !excludedIds.has(s.id))
  const excluded: ClubRosterStudent[] = schedule.exclusions
    .filter((e) => memberIds.has(e.studentId))
    .map((e) => ({ ...e.student, note: e.note }))

  const applicantsNotInGroup: ClubRosterStudent[] = []
  if (schedule.clubGroup) {
    for (const sel of schedule.club.selections) {
      if (!memberIds.has(sel.student.id)) {
        applicantsNotInGroup.push(sel.student)
      }
    }
  }

  return {
    roster: {
      schedule: {
        id: schedule.id,
        dayOfWeek: schedule.dayOfWeek,
        dayLabel: DAY_LABELS[schedule.dayOfWeek] || `Gün ${schedule.dayOfWeek}`,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        room: schedule.room,
        clubId: schedule.clubId,
        clubName: schedule.club.name,
        clubGroupId: schedule.clubGroupId,
        clubGroupName: schedule.clubGroup?.name ?? null,
      },
      active,
      excluded,
      applicantsNotInGroup,
    },
  }
}
