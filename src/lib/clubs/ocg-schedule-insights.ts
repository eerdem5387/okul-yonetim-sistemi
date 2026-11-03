import { prisma } from "@/lib/prisma"
import { effectiveClubGradeLevels } from "@/lib/club-grade-levels"
import { DAY_LABELS, hasTimeConflict } from "@/lib/schedules/time-conflict"
import { parseStudentGradeLevel } from "@/lib/student-grade-level"

type Block = { dayOfWeek: number; startTime: string; endTime: string }

function keyOf(b: Block) {
  return `${b.dayOfWeek}|${b.startTime}|${b.endTime}`
}

function labelOf(b: Block) {
  return `${DAY_LABELS[b.dayOfWeek] || `Gün ${b.dayOfWeek}`} ${b.startTime}–${b.endTime}`
}

function blocksConflict(a: Block, b: Block) {
  return (
    a.dayOfWeek === b.dayOfWeek &&
    hasTimeConflict(a.startTime, a.endTime, b.startTime, b.endTime)
  )
}

export type OcgGradeLoad = {
  grade: number
  slots: { label: string; students: number }[]
}

export type ClubConflictRow = {
  id: string
  name: string
  grades: number[]
  slots: string[]
  conflictScore: number
  severity: "high" | "medium" | "low" | "none"
  details: { grade: number; load: number; notes: string[] }[]
}

export type SwapSuggestion = {
  clubAId: string
  clubAName: string
  clubBId: string
  clubBName: string
  aSlots: string[]
  bSlots: string[]
  aGrades: number[]
  bGrades: number[]
  sharedGrades: number[]
  before: number
  after: number
  gain: number
  summary: string
}

export type OcgScheduleInsights = {
  generatedAt: string
  summary: {
    clubsTotal: number
    clubsWithSchedule: number
    clubsWithoutSchedule: number
    highConflictCount: number
    zeroConflictCount: number
    swapCount: number
  }
  headline: string
  gradeLoads: OcgGradeLoad[]
  clubs: ClubConflictRow[]
  withoutSchedule: { id: string; name: string; grades: number[] }[]
  swaps: SwapSuggestion[]
}

function severityOf(score: number): ClubConflictRow["severity"] {
  if (score <= 0) return "none"
  if (score >= 300) return "high"
  if (score >= 150) return "medium"
  return "low"
}

export async function buildOcgScheduleInsights(): Promise<OcgScheduleInsights> {
  const [clubs, clubSchedules, studyGroups, studySessions] = await Promise.all([
    prisma.club.findMany({
      select: { id: true, name: true, gradeLevels: true },
      orderBy: { name: "asc" },
    }),
    prisma.clubSchedule.findMany({
      where: {
        isActive: true,
        OR: [{ clubGroupId: null }, { clubGroup: { isActive: true } }],
      },
      select: {
        clubId: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true,
        clubGroupId: true,
      },
    }),
    prisma.studyGroup.findMany({
      where: { isActive: true },
      select: {
        id: true,
        students: { select: { student: { select: { grade: true } } } },
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

  const gradeBusy = new Map<number, Block[]>()
  const gradeBusyStudents = new Map<number, Map<string, number>>()

  for (const g of studyGroups) {
    const sessions = studySessions.filter((s) => s.studyGroupId === g.id)
    if (sessions.length === 0) continue
    const gradeCounts = new Map<number, number>()
    for (const m of g.students) {
      const lv = parseStudentGradeLevel(m.student.grade)
      if (lv == null) continue
      gradeCounts.set(lv, (gradeCounts.get(lv) || 0) + 1)
    }
    for (const [grade, count] of gradeCounts) {
      if (!gradeBusy.has(grade)) gradeBusy.set(grade, [])
      if (!gradeBusyStudents.has(grade)) gradeBusyStudents.set(grade, new Map())
      const blocks = gradeBusy.get(grade)!
      const slotMap = gradeBusyStudents.get(grade)!
      for (const s of sessions) {
        const b: Block = {
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
        }
        if (!blocks.some((x) => keyOf(x) === keyOf(b))) blocks.push(b)
        slotMap.set(keyOf(b), (slotMap.get(keyOf(b)) || 0) + count)
      }
    }
  }

  const clubBlocks = new Map<string, Block[]>()
  for (const club of clubs) {
    const rows = clubSchedules.filter((s) => s.clubId === club.id)
    const clubLevel = rows.filter((s) => !s.clubGroupId)
    const use = clubLevel.length > 0 ? clubLevel : rows
    const uniq: Block[] = []
    for (const s of use) {
      const b: Block = {
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
      }
      if (!uniq.some((x) => keyOf(x) === keyOf(b))) uniq.push(b)
    }
    clubBlocks.set(club.id, uniq)
  }

  function conflictIf(clubGrades: number[], blocks: Block[]) {
    let score = 0
    for (const grade of clubGrades) {
      const busyBlocks = gradeBusy.get(grade) || []
      const slotMap = gradeBusyStudents.get(grade) || new Map()
      for (const b of blocks) {
        for (const ob of busyBlocks) {
          if (blocksConflict(b, ob)) score += slotMap.get(keyOf(ob)) || 0
        }
      }
    }
    return score
  }

  const scored: ClubConflictRow[] = []
  const withoutSchedule: OcgScheduleInsights["withoutSchedule"] = []

  for (const club of clubs) {
    const grades = effectiveClubGradeLevels(club.gradeLevels)
    const blocks = clubBlocks.get(club.id) || []
    if (blocks.length === 0) {
      withoutSchedule.push({ id: club.id, name: club.name, grades })
      continue
    }
    let conflictScore = 0
    const details: ClubConflictRow["details"] = []
    for (const grade of grades) {
      const slotMap = gradeBusyStudents.get(grade) || new Map()
      let load = 0
      const notes: string[] = []
      for (const b of blocks) {
        for (const ob of gradeBusy.get(grade) || []) {
          if (!blocksConflict(b, ob)) continue
          const n = slotMap.get(keyOf(ob)) || 0
          load += n
          conflictScore += n
          notes.push(`${labelOf(b)} ↔ ÖÇG ${labelOf(ob)} (~${n} öğrenci)`)
        }
      }
      if (load > 0) details.push({ grade, load, notes: notes.slice(0, 4) })
    }
    scored.push({
      id: club.id,
      name: club.name,
      grades,
      slots: blocks.map(labelOf),
      conflictScore,
      severity: severityOf(conflictScore),
      details,
    })
  }

  scored.sort(
    (a, b) =>
      b.conflictScore - a.conflictScore ||
      a.name.localeCompare(b.name, "tr", { sensitivity: "base" })
  )

  const swaps: SwapSuggestion[] = []
  for (let i = 0; i < scored.length; i++) {
    for (let j = i + 1; j < scored.length; j++) {
      const A = scored[i]
      const B = scored[j]
      const sharedGrades = A.grades.filter((g) => B.grades.includes(g))
      if (sharedGrades.length === 0) continue
      const aBlocks = clubBlocks.get(A.id) || []
      const bBlocks = clubBlocks.get(B.id) || []
      if (!aBlocks.length || !bBlocks.length) continue
      const aKeys = aBlocks.map(keyOf).sort().join(",")
      const bKeys = bBlocks.map(keyOf).sort().join(",")
      if (aKeys === bKeys) continue

      const before = conflictIf(A.grades, aBlocks) + conflictIf(B.grades, bBlocks)
      const after = conflictIf(A.grades, bBlocks) + conflictIf(B.grades, aBlocks)
      const gain = before - after
      if (gain < 40) continue

      swaps.push({
        clubAId: A.id,
        clubAName: A.name,
        clubBId: B.id,
        clubBName: B.name,
        aSlots: A.slots,
        bSlots: B.slots,
        aGrades: A.grades,
        bGrades: B.grades,
        sharedGrades,
        before,
        after,
        gain,
        summary: `${A.name} programını (${A.slots.join(", ")}) ile ${B.name} programını (${B.slots.join(", ")}) yer değiştirirseniz ortak sınıflarda (~${sharedGrades.join(", ")}) ÖÇG çakışması yaklaşık ${gain} birim azalır.`,
      })
    }
  }
  swaps.sort((a, b) => b.gain - a.gain || a.clubAName.localeCompare(b.clubAName, "tr"))

  // Deduplicate similar swap themes: keep top N unique club pairs by gain
  const seenPairs = new Set<string>()
  const uniqueSwaps: SwapSuggestion[] = []
  for (const s of swaps) {
    const pair = [s.clubAId, s.clubBId].sort().join(":")
    if (seenPairs.has(pair)) continue
    seenPairs.add(pair)
    uniqueSwaps.push(s)
    if (uniqueSwaps.length >= 20) break
  }

  const gradeLoads: OcgGradeLoad[] = [...gradeBusyStudents.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([grade, slotMap]) => ({
      grade,
      slots: [...slotMap.entries()]
        .map(([k, students]) => {
          const [d, st, et] = k.split("|")
          return {
            label: labelOf({ dayOfWeek: Number(d), startTime: st, endTime: et }),
            students,
          }
        })
        .sort((a, b) => b.students - a.students),
    }))

  const highConflictCount = scored.filter((c) => c.severity === "high").length
  const zeroConflictCount = scored.filter((c) => c.severity === "none").length

  let headline =
    "Kulüp etütleri ile ÖÇG programları karşılaştırıldı. Öneriler yalnızca yol gösterir; otomatik değişiklik yapılmaz."
  if (highConflictCount > 0) {
    headline = `${highConflictCount} kulüp ÖÇG ile yüksek çakışıyor. Aşağıdaki takas önerilerine göre programları güncelleyerek daha fazla öğrencinin kulüp seçmesini sağlayabilirsiniz.`
  }

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      clubsTotal: clubs.length,
      clubsWithSchedule: scored.length,
      clubsWithoutSchedule: withoutSchedule.length,
      highConflictCount,
      zeroConflictCount,
      swapCount: uniqueSwaps.length,
    },
    headline,
    gradeLoads,
    clubs: scored,
    withoutSchedule,
    swaps: uniqueSwaps,
  }
}
