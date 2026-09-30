import { prisma } from "@/lib/prisma"
import { DAY_LABELS } from "@/lib/schedules/time-conflict"

/** Bu program saatinden muaf tutulan öğrenci id’leri */
export async function loadExcludedStudentIdsForSchedules(
  clubScheduleIds: string[]
): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>()
  if (clubScheduleIds.length === 0) return map

  const rows = await prisma.clubScheduleExclusion.findMany({
    where: { clubScheduleId: { in: clubScheduleIds } },
    select: { clubScheduleId: true, studentId: true },
  })
  for (const r of rows) {
    const set = map.get(r.clubScheduleId) ?? new Set()
    set.add(r.studentId)
    map.set(r.clubScheduleId, set)
  }
  return map
}

export function filterStudentsExcluding(
  students: Array<{ id: string }>,
  excluded: Set<string> | undefined
) {
  if (!excluded || excluded.size === 0) return students
  return students.filter((s) => !excluded.has(s.id))
}

/** Öğrenciyi yalnızca bu kulüp program saatinden çıkarır (grup üyeliği kalır) */
export async function excludeStudentFromClubSchedule(options: {
  studentId: string
  clubScheduleId: string
  note?: string | null
}): Promise<{ excluded: string; error?: string }> {
  const { studentId, clubScheduleId, note } = options

  const schedule = await prisma.clubSchedule.findUnique({
    where: { id: clubScheduleId },
    select: {
      id: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      club: { select: { name: true } },
      clubGroup: { select: { id: true, name: true } },
    },
  })
  if (!schedule) {
    return { excluded: "", error: "Kulüp programı bulunamadı" }
  }

  // Üyelik kontrolü: grup veya seçim
  if (schedule.clubGroup) {
    const member = await prisma.clubGroupStudent.findUnique({
      where: {
        clubGroupId_studentId: {
          clubGroupId: schedule.clubGroup.id,
          studentId,
        },
      },
    })
    if (!member) {
      return {
        excluded: "",
        error: `Öğrenci ${schedule.club.name} grubunda değil`,
      }
    }
  }

  await prisma.clubScheduleExclusion.upsert({
    where: {
      clubScheduleId_studentId: { clubScheduleId, studentId },
    },
    create: {
      clubScheduleId,
      studentId,
      note: note?.trim() || "Çakışma nedeniyle bu saatten muaf",
    },
    update: {
      note: note?.trim() || undefined,
    },
  })

  const day = DAY_LABELS[schedule.dayOfWeek] || `Gün ${schedule.dayOfWeek}`
  const groupBit = schedule.clubGroup ? ` / ${schedule.clubGroup.name}` : ""
  return {
    excluded: `${schedule.club.name}${groupBit} · ${day} ${schedule.startTime}–${schedule.endTime} saatinden çıkarıldı (diğer günler devam eder)`,
  }
}

/** İstisnayı kaldır — öğrenci o saate geri döner */
export async function restoreStudentToClubSchedule(options: {
  studentId: string
  clubScheduleId: string
}): Promise<{ restored: string; error?: string }> {
  const { studentId, clubScheduleId } = options
  const schedule = await prisma.clubSchedule.findUnique({
    where: { id: clubScheduleId },
    select: {
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      club: { select: { name: true } },
    },
  })
  if (!schedule) {
    return { restored: "", error: "Kulüp programı bulunamadı" }
  }

  const del = await prisma.clubScheduleExclusion.deleteMany({
    where: { clubScheduleId, studentId },
  })
  if (del.count === 0) {
    return { restored: "", error: "Bu saat için muafiyet kaydı yok" }
  }

  const day = DAY_LABELS[schedule.dayOfWeek] || `Gün ${schedule.dayOfWeek}`
  return {
    restored: `${schedule.club.name} · ${day} ${schedule.startTime}–${schedule.endTime} saatine geri alındı`,
  }
}
