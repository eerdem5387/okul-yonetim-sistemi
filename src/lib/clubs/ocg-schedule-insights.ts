import { prisma } from "@/lib/prisma"
import { effectiveClubGradeLevels } from "@/lib/club-grade-levels"
import {
  resolveScheduleInstructorId,
  wouldInstructorConflictAfterClubSwap,
  type ClubScheduleBlock,
} from "@/lib/clubs/club-instructor-conflicts"
import { hasTimeConflict } from "@/lib/schedules/time-conflict"
import { parseStudentGradeLevel } from "@/lib/student-grade-level"

type Block = { dayOfWeek: number; startTime: string; endTime: string }

function keyOf(b: Block) {
  return `${b.dayOfWeek}|${b.startTime}|${b.endTime}`
}

function blocksConflict(a: Block, b: Block) {
  return (
    a.dayOfWeek === b.dayOfWeek &&
    hasTimeConflict(a.startTime, a.endTime, b.startTime, b.endTime)
  )
}

export type SwapSuggestion = {
  clubAId: string
  clubAName: string
  clubBId: string
  clubBName: string
  /** Yer değişince ekstra kulüp seçebilir hale gelen öğrenci sayısı */
  extraStudents: number
  /** Avantaj gören ÖÇG grup adları */
  benefitingGroups: string[]
  summary: string
}

export type OcgScheduleInsights = {
  generatedAt: string
  summary: {
    clubsWithSchedule: number
    suggestionCount: number
  }
  headline: string
  swaps: SwapSuggestion[]
}

type StudentBusy = {
  studentId: string
  gradeLevel: number
  busy: Block[]
  groupNames: string[]
}

export async function buildOcgScheduleInsights(): Promise<OcgScheduleInsights> {
  const [clubs, clubSchedules, studyGroups, studySessions] = await Promise.all([
    prisma.club.findMany({
      select: { id: true, name: true, gradeLevels: true, instructorId: true },
      orderBy: { name: "asc" },
    }),
    prisma.clubSchedule.findMany({
      where: {
        isActive: true,
        OR: [{ clubGroupId: null }, { clubGroup: { isActive: true } }],
      },
      select: {
        id: true,
        clubId: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true,
        clubGroupId: true,
        instructorId: true,
        club: { select: { instructorId: true } },
      },
    }),
    prisma.studyGroup.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        students: {
          select: { student: { select: { id: true, grade: true } } },
        },
      },
    }),
    prisma.studyGroupSession.findMany({
      where: { isActive: true },
      select: {
        studyGroupId: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true,
      },
    }),
  ])

  const sessionsByGroup = new Map<string, Block[]>()
  for (const s of studySessions) {
    const list = sessionsByGroup.get(s.studyGroupId) || []
    list.push({
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
    })
    sessionsByGroup.set(s.studyGroupId, list)
  }

  const studentMap = new Map<string, StudentBusy>()
  for (const g of studyGroups) {
    const sessions = sessionsByGroup.get(g.id) || []
    if (sessions.length === 0) continue
    for (const row of g.students) {
      const gradeLevel = parseStudentGradeLevel(row.student.grade)
      if (gradeLevel == null) continue
      const existing = studentMap.get(row.student.id)
      if (!existing) {
        studentMap.set(row.student.id, {
          studentId: row.student.id,
          gradeLevel,
          busy: [...sessions],
          groupNames: [g.name],
        })
      } else {
        for (const sess of sessions) {
          if (!existing.busy.some((b) => keyOf(b) === keyOf(sess))) {
            existing.busy.push(sess)
          }
        }
        if (!existing.groupNames.includes(g.name)) {
          existing.groupNames.push(g.name)
        }
      }
    }
  }
  const students = [...studentMap.values()]

  const clubBlocks = new Map<string, Block[]>()
  const clubInstructorBlocks = new Map<string, ClubScheduleBlock[]>()
  const clubMeta = new Map<string, { name: string; grades: number[] }>()

  // Tüm aktif satırlar: takas sonrası öğretmen çakışması için (swap ile aynı kapsam)
  const allInstructorBlocks: ClubScheduleBlock[] = clubSchedules.map((s) => ({
    id: s.id,
    clubId: s.clubId,
    dayOfWeek: s.dayOfWeek,
    startTime: s.startTime,
    endTime: s.endTime,
    instructorId: resolveScheduleInstructorId(s),
  }))

  for (const club of clubs) {
    clubMeta.set(club.id, {
      name: club.name,
      grades: effectiveClubGradeLevels(club.gradeLevels),
    })
    const rows = clubSchedules.filter((s) => s.clubId === club.id)
    const clubLevel = rows.filter((s) => !s.clubGroupId)
    const use = clubLevel.length > 0 ? clubLevel : rows
    const uniq: Block[] = []
    const instructorBlocks: ClubScheduleBlock[] = []
    for (const s of use) {
      const b: Block = {
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
      }
      if (!uniq.some((x) => keyOf(x) === keyOf(b))) uniq.push(b)
      instructorBlocks.push({
        id: s.id,
        clubId: club.id,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        instructorId: resolveScheduleInstructorId(s) || club.instructorId || null,
      })
    }
    clubBlocks.set(club.id, uniq)
    clubInstructorBlocks.set(club.id, instructorBlocks)
  }

  function canSelect(student: StudentBusy, grades: number[], slots: Block[]) {
    if (!grades.includes(student.gradeLevel)) return false
    if (slots.length === 0) return false
    return !student.busy.some((busy) => slots.some((slot) => blocksConflict(slot, busy)))
  }

  const scheduledClubIds = [...clubBlocks.entries()]
    .filter(([, blocks]) => blocks.length > 0)
    .map(([id]) => id)

  const swaps: SwapSuggestion[] = []

  for (let i = 0; i < scheduledClubIds.length; i++) {
    for (let j = i + 1; j < scheduledClubIds.length; j++) {
      const aId = scheduledClubIds[i]
      const bId = scheduledClubIds[j]
      const aMeta = clubMeta.get(aId)!
      const bMeta = clubMeta.get(bId)!
      const aSlots = clubBlocks.get(aId)!
      const bSlots = clubBlocks.get(bId)!

      if (!aMeta.grades.some((g) => bMeta.grades.includes(g))) continue
      if (aSlots.map(keyOf).sort().join(",") === bSlots.map(keyOf).sort().join(",")) continue

      const instructorConflict = wouldInstructorConflictAfterClubSwap({
        clubAId: aId,
        clubBId: bId,
        aBlocks: clubInstructorBlocks.get(aId) || [],
        bBlocks: clubInstructorBlocks.get(bId) || [],
        otherBlocks: allInstructorBlocks,
      })
      if (instructorConflict) continue

      const gained = new Set<string>()
      const gainedGroups = new Set<string>()

      for (const student of students) {
        const canABefore = canSelect(student, aMeta.grades, aSlots)
        const canBBefore = canSelect(student, bMeta.grades, bSlots)
        const canAAfter = canSelect(student, aMeta.grades, bSlots)
        const canBAfter = canSelect(student, bMeta.grades, aSlots)

        const selectableBefore = (canABefore ? 1 : 0) + (canBBefore ? 1 : 0)
        const selectableAfter = (canAAfter ? 1 : 0) + (canBAfter ? 1 : 0)
        if (selectableAfter <= selectableBefore) continue

        gained.add(student.studentId)
        for (const name of student.groupNames) gainedGroups.add(name)
      }

      const extraStudents = gained.size
      if (extraStudents < 5) continue

      const benefitingGroups = [...gainedGroups].sort((a, b) =>
        a.localeCompare(b, "tr", { sensitivity: "base" })
      )
      const groupPart =
        benefitingGroups.length === 0
          ? "ilgili ÖÇG gruplarındaki"
          : benefitingGroups.length <= 5
            ? `${benefitingGroups.join(", ")} ÖÇG’lerindeki`
            : `${benefitingGroups.slice(0, 5).join(", ")} ve ${benefitingGroups.length - 5} ÖÇG daha içindeki`

      swaps.push({
        clubAId: aId,
        clubAName: aMeta.name,
        clubBId: bId,
        clubBName: bMeta.name,
        extraStudents,
        benefitingGroups,
        summary: `${aMeta.name} ile ${bMeta.name} kulüplerinin program yerlerini birbirleriyle değiştirirseniz, ${groupPart} yaklaşık ${extraStudents} öğrenci daha fazla kulüp seçebilecek.`,
      })
    }
  }

  swaps.sort(
    (a, b) =>
      b.extraStudents - a.extraStudents ||
      a.clubAName.localeCompare(b.clubAName, "tr", { sensitivity: "base" })
  )

  const seen = new Set<string>()
  const unique: SwapSuggestion[] = []
  for (const s of swaps) {
    const key = [s.clubAId, s.clubBId].sort().join(":")
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(s)
    if (unique.length >= 25) break
  }

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      clubsWithSchedule: scheduledClubIds.length,
      suggestionCount: unique.length,
    },
    headline:
      unique.length > 0
        ? "Aşağıda program yer değişikliği önerileri var. Her kartta hangi iki kulübü değiştirirseniz kaç öğrencinin daha fazla kulüp seçebileceği yazıyor."
        : "Şu an anlamlı bir program yer değişimi önerisi bulunamadı.",
    swaps: unique,
  }
}
