import { prisma } from "@/lib/prisma"
import { hasTimeConflict } from "@/lib/schedules/time-conflict"

export async function assertTeacherFreeForStudySession(options: {
  teacherId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  excludeSessionId?: string
}): Promise<string | null> {
  const { teacherId, dayOfWeek, startTime, endTime, excludeSessionId } = options

  const [schedules, sessions] = await Promise.all([
    prisma.schedule.findMany({
      where: { teacherId, dayOfWeek, isActive: true },
      include: { class: { select: { name: true } } },
    }),
    prisma.studyGroupSession.findMany({
      where: {
        teacherId,
        dayOfWeek,
        isActive: true,
        ...(excludeSessionId ? { id: { not: excludeSessionId } } : {}),
      },
      include: { studyGroup: { select: { name: true } } },
    }),
  ])

  const scheduleConflicts = schedules.filter((s) =>
    hasTimeConflict(s.startTime, s.endTime, startTime, endTime)
  )
  if (scheduleConflicts.length > 0) {
    const info = scheduleConflicts
      .map((c) => `${c.class.name} · ${c.subjectName} (${c.startTime}–${c.endTime})`)
      .join(", ")
    return `Öğretmenin aynı saatte sınıf dersi var: ${info}`
  }

  const sessionConflicts = sessions.filter((s) =>
    hasTimeConflict(s.startTime, s.endTime, startTime, endTime)
  )
  if (sessionConflicts.length > 0) {
    const info = sessionConflicts
      .map((s) => `${s.studyGroup.name} (${s.startTime}–${s.endTime})`)
      .join(", ")
    return `Öğretmenin aynı saatte başka özel çalışma ataması var: ${info}`
  }

  return null
}

export async function assertStudentsFreeForStudySession(options: {
  studentIds: string[]
  dayOfWeek: number
  startTime: string
  endTime: string
  excludeSessionId?: string
}): Promise<string | null> {
  // Öğrenci çakışmaları program atamasını engellemez.
  // Kulüp ↔ ÖÇG / grup ↔ grup çakışmaları "Çakışan Öğrenciler" paneli ile çözülür.
  void options
  return null
}
