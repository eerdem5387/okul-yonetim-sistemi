import { prisma } from "@/lib/prisma"
import { normalizeSlotKind } from "@/lib/schedules/day-templates"
import { DAY_LABELS, hasTimeConflict } from "@/lib/schedules/time-conflict"
import { parseStudentGradeLevel } from "@/lib/student-grade-level"

/** Deneme çakışması için: grup üyelerinin sınıf düzeyleri (yoksa kulüp gradeLevels). */
export async function resolveClubScheduleGradeLevels(options: {
  clubId: string
  clubGroupId?: string | null
}): Promise<number[]> {
  const { clubId, clubGroupId } = options
  if (clubGroupId) {
    const members = await prisma.clubGroupStudent.findMany({
      where: { clubGroupId },
      select: { student: { select: { grade: true } } },
    })
    const levels = new Set<number>()
    for (const m of members) {
      const level = parseStudentGradeLevel(m.student.grade)
      if (level != null) levels.add(level)
    }
    if (levels.size > 0) return [...levels].sort((a, b) => a - b)
  }
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { gradeLevels: true },
  })
  return club?.gradeLevels ?? []
}

export type EtutSlot = {
  label: string
  startTime: string
  endTime: string
  band: "ortaokul" | "lise"
}

/** Ortaokul + lise şablonlarından benzersiz etüt saatleri. */
export async function loadEtutSlots(): Promise<EtutSlot[]> {
  const templates = await prisma.schoolDayTemplate.findMany({
    include: { slots: { orderBy: { sortOrder: "asc" } } },
  })
  const out: EtutSlot[] = []
  const seen = new Set<string>()
  for (const t of templates) {
    const band = t.band === "ORTAOKUL" ? "ortaokul" : "lise"
    for (const s of t.slots) {
      if (normalizeSlotKind(s.kind, s.label) !== "ETUT") continue
      const key = `${s.startTime}|${s.endTime}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({
        label: s.label,
        startTime: s.startTime,
        endTime: s.endTime,
        band,
      })
    }
  }
  return out
}

export async function assertEtutSlot(
  startTime: string,
  endTime: string
): Promise<string | null> {
  const etuts = await loadEtutSlots()
  if (etuts.length === 0) {
    return "Önce Ders saatleri’nde en az bir Etüt satırı tanımlayın."
  }
  const ok = etuts.some((s) => s.startTime === startTime && s.endTime === endTime)
  if (!ok) {
    return "Kulüpler yalnızca tanımlı etüt saatlerine yerleştirilebilir."
  }
  return null
}

export async function assertClubSlotFree(options: {
  clubId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  excludeId?: string
  /** Atama sırasında seçilen öğretmen (kulüp instructor güncellenmeden önce) */
  instructorIdOverride?: string | null
  /** Varsa çakışma kontrolü bu grubun öğrencilerine göre yapılır */
  clubGroupId?: string | null
}): Promise<string | null> {
  const {
    clubId,
    dayOfWeek,
    startTime,
    endTime,
    excludeId,
    instructorIdOverride,
    clubGroupId,
  } = options

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: {
      id: true,
      name: true,
      instructorId: true,
    },
  })
  if (!club) return "Kulüp bulunamadı"

  if (clubGroupId) {
    const group = await prisma.clubGroup.findUnique({
      where: { id: clubGroupId },
      select: {
        id: true,
        clubId: true,
        isActive: true,
      },
    })
    if (!group || !group.isActive) return "Kulüp grubu bulunamadı"
    if (group.clubId !== clubId) return "Grup bu kulübe ait değil"
  }

  const instructorId =
    instructorIdOverride !== undefined ? instructorIdOverride : club.instructorId

  const sameClub = await prisma.clubSchedule.findMany({
    where: {
      clubId,
      dayOfWeek,
      isActive: true,
      OR: [{ clubGroupId: null }, { clubGroup: { isActive: true } }],
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  })
  if (
    sameClub.some((s) => hasTimeConflict(s.startTime, s.endTime, startTime, endTime))
  ) {
    return "Bu kulüp aynı gün/saatte zaten programda."
  }

  if (instructorId) {
    const [schedules, groups, otherClubRows] = await Promise.all([
      prisma.schedule.findMany({
        where: { teacherId: instructorId, dayOfWeek, isActive: true },
        include: { class: { select: { name: true } } },
      }),
      prisma.studyGroupSession.findMany({
        where: { teacherId: instructorId, dayOfWeek, isActive: true },
        include: { studyGroup: { select: { name: true } } },
      }),
      prisma.clubSchedule.findMany({
        where: {
          dayOfWeek,
          isActive: true,
          OR: [{ clubGroupId: null }, { clubGroup: { isActive: true } }],
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        include: {
          club: { select: { name: true, instructorId: true } },
          clubGroup: { select: { name: true } },
        },
      }),
    ])

    const schedHit = schedules.filter((s) =>
      hasTimeConflict(s.startTime, s.endTime, startTime, endTime)
    )
    if (schedHit.length > 0) {
      const info = schedHit
        .map((c) => `${c.class.name} · ${c.subjectName}`)
        .join(", ")
      return `Sorumlu öğretmenin aynı saatte dersi var: ${info}`
    }

    const groupHit = groups.filter((g) =>
      hasTimeConflict(g.startTime, g.endTime, startTime, endTime)
    )
    if (groupHit.length > 0) {
      const info = groupHit.map((g) => g.studyGroup.name).join(", ")
      return `Sorumlu öğretmenin aynı saatte özel çalışma ataması var: ${info}`
    }

    const clubHit = otherClubRows.filter((c) => {
      const rowInstructor = c.instructorId ?? c.club.instructorId
      if (rowInstructor !== instructorId) return false
      return hasTimeConflict(c.startTime, c.endTime, startTime, endTime)
    })
    if (clubHit.length > 0) {
      const info = clubHit
        .map((c) =>
          c.clubGroup?.name ? `${c.club.name} · ${c.clubGroup.name}` : c.club.name
        )
        .join(", ")
      return `Sorumlu öğretmen aynı saatte başka kulüpte: ${info}`
    }
  }

  // Öğrenci çakışmaları engellemez; "Çakışan Öğrenciler" paneli ile çözülür.
  // Öğretmen / aynı kulüp aynı saat çakışmaları hâlâ engellenir.

  return null
}

export { DAY_LABELS }
