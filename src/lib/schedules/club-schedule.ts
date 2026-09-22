import { prisma } from "@/lib/prisma"
import { normalizeSlotKind } from "@/lib/schedules/day-templates"
import { DAY_LABELS, hasTimeConflict } from "@/lib/schedules/time-conflict"

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
}): Promise<string | null> {
  const { clubId, dayOfWeek, startTime, endTime, excludeId, instructorIdOverride } = options

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: {
      id: true,
      name: true,
      instructorId: true,
      selections: { select: { studentId: true } },
    },
  })
  if (!club) return "Kulüp bulunamadı"

  const instructorId =
    instructorIdOverride !== undefined ? instructorIdOverride : club.instructorId

  const sameClub = await prisma.clubSchedule.findMany({
    where: {
      clubId,
      dayOfWeek,
      isActive: true,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  })
  if (
    sameClub.some((s) => hasTimeConflict(s.startTime, s.endTime, startTime, endTime))
  ) {
    return "Bu kulüp aynı gün/saatte zaten programda."
  }

  if (instructorId) {
    const [schedules, groups, otherClubs] = await Promise.all([
      prisma.schedule.findMany({
        where: { teacherId: instructorId, dayOfWeek, isActive: true },
        include: { class: { select: { name: true } } },
      }),
      prisma.studyGroup.findMany({
        where: { teacherId: instructorId, dayOfWeek, isActive: true },
      }),
      prisma.clubSchedule.findMany({
        where: {
          dayOfWeek,
          isActive: true,
          club: { instructorId },
          ...(excludeId ? { id: { not: excludeId } } : {}),
          clubId: { not: clubId },
        },
        include: { club: { select: { name: true } } },
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
      const info = groupHit.map((g) => g.name).join(", ")
      return `Sorumlu öğretmenin aynı saatte özel çalışma grubu var: ${info}`
    }

    const clubHit = otherClubs.filter((c) =>
      hasTimeConflict(c.startTime, c.endTime, startTime, endTime)
    )
    if (clubHit.length > 0) {
      const info = clubHit.map((c) => c.club.name).join(", ")
      return `Sorumlu öğretmen aynı saatte başka kulüpte: ${info}`
    }
  }

  const studentIds = club.selections.map((s) => s.studentId)
  if (studentIds.length > 0) {
    const memberConflicts = await prisma.clubSchedule.findMany({
      where: {
        dayOfWeek,
        isActive: true,
        clubId: { not: clubId },
        ...(excludeId ? { id: { not: excludeId } } : {}),
        club: { selections: { some: { studentId: { in: studentIds } } } },
      },
      include: {
        club: {
          select: {
            name: true,
            selections: {
              where: { studentId: { in: studentIds } },
              select: {
                student: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    })
    const overlap = memberConflicts.filter((c) =>
      hasTimeConflict(c.startTime, c.endTime, startTime, endTime)
    )
    if (overlap.length > 0) {
      const info = overlap
        .map((c) => {
          const names = c.club.selections
            .map((s) => `${s.student.firstName} ${s.student.lastName}`)
            .join(", ")
          return `${names} → ${c.club.name}`
        })
        .join("; ")
      return `Bazı öğrenciler aynı etütte başka kulüpte: ${info}`
    }
  }

  return null
}

export { DAY_LABELS }
