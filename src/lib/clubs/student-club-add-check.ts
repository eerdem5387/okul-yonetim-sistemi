import { prisma } from "@/lib/prisma"
import { DAY_LABELS } from "@/lib/schedules/time-conflict"
import { scheduleBlocksConflict, type ScheduleBlock } from "@/lib/clubs/schedule-blocks"
import { clubMatchesStudentGrade } from "@/lib/club-grade-levels"
import { parseStudentGradeLevel } from "@/lib/student-grade-level"

export type BusyBlockKind = "STUDY_GROUP" | "CLUB" | "GRADE_EXAM"

export type LabeledBlock = ScheduleBlock & {
  kind: BusyBlockKind
  label: string
}

export type ClubAddConflict = {
  dayOfWeek: number
  dayLabel: string
  /** Eklenmek istenen kulübün saati */
  clubTime: string
  /** Çakışan mevcut program */
  with: LabeledBlock & { time: string }
}

export type AlternativeClub = {
  clubId: string
  clubName: string
  teacherName: string | null
  memberCount: number
  capacity: number
  schedule: string[]
  /** Hedef kulüple aynı gün/saat diliminde mi (öğretmenin planına en yakın seçenek) */
  sameSlotAsTarget: boolean
}

export type StudentClubAddCheck = {
  studentId: string
  studentName: string
  clubId: string
  clubName: string
  /** Kulübün tanımlı programı yoksa çakışma kontrolü yapılamaz */
  clubHasSchedule: boolean
  clubSchedule: string[]
  conflicts: ClubAddConflict[]
  alternatives: AlternativeClub[]
}

const fmt = (b: ScheduleBlock) =>
  `${DAY_LABELS[b.dayOfWeek] || `Gün ${b.dayOfWeek}`} ${b.startTime}–${b.endTime}`

function sortBlocks<T extends ScheduleBlock>(blocks: T[]): T[] {
  return blocks
    .slice()
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))
}

/**
 * Kulübün program blokları: kulüp seviyesinde (grupsuz) program varsa o,
 * yoksa aktif gruplarının programları.
 */
function clubBlocks(
  schedules: Array<{ clubGroupId: string | null; dayOfWeek: number; startTime: string; endTime: string }>
): ScheduleBlock[] {
  const clubLevel = schedules.filter((s) => !s.clubGroupId)
  const src = clubLevel.length > 0 ? clubLevel : schedules
  const seen = new Set<string>()
  const out: ScheduleBlock[] = []
  for (const s of src) {
    const k = `${s.dayOfWeek}|${s.startTime}|${s.endTime}`
    if (seen.has(k)) continue
    seen.add(k)
    out.push({ dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime })
  }
  return sortBlocks(out)
}

/** Öğrencinin mevcut haftalık meşguliyeti: ÖÇG etütleri, diğer kulüpler, sınıf denemeleri */
async function loadStudentBusyBlocks(
  studentId: string,
  gradeLevel: number | null,
  excludeClubId: string
): Promise<LabeledBlock[]> {
  const [sessions, selections, groupMemberships, exclusions, exams] = await Promise.all([
    prisma.studyGroupSession.findMany({
      where: {
        isActive: true,
        studyGroup: { isActive: true, students: { some: { studentId } } },
      },
      select: {
        dayOfWeek: true,
        startTime: true,
        endTime: true,
        topic: true,
        studyGroup: { select: { name: true } },
      },
    }),
    prisma.clubSelection.findMany({
      where: { studentId, clubId: { not: excludeClubId } },
      select: {
        club: {
          select: {
            id: true,
            name: true,
            schedules: {
              where: { isActive: true, clubGroupId: null },
              select: { id: true, dayOfWeek: true, startTime: true, endTime: true },
            },
          },
        },
      },
    }),
    prisma.clubGroupStudent.findMany({
      where: { studentId, clubGroup: { isActive: true, clubId: { not: excludeClubId } } },
      select: {
        clubGroup: {
          select: {
            name: true,
            club: { select: { name: true } },
            schedules: {
              where: { isActive: true },
              select: { id: true, dayOfWeek: true, startTime: true, endTime: true },
            },
          },
        },
      },
    }),
    prisma.clubScheduleExclusion.findMany({
      where: { studentId },
      select: { clubScheduleId: true },
    }),
    gradeLevel != null
      ? prisma.gradeEtutExam.findMany({
          where: { isActive: true, grade: gradeLevel },
          select: { dayOfWeek: true, startTime: true, endTime: true, title: true },
        })
      : Promise.resolve([]),
  ])

  const excluded = new Set(exclusions.map((e) => e.clubScheduleId))
  const blocks: LabeledBlock[] = []

  for (const s of sessions) {
    blocks.push({
      kind: "STUDY_GROUP",
      label: `Etüt (ÖÇG) · ${s.studyGroup.name}${
        s.topic && s.topic.trim() !== s.studyGroup.name.trim() ? ` · ${s.topic}` : ""
      }`,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
    })
  }
  for (const sel of selections) {
    for (const s of sel.club.schedules) {
      if (excluded.has(s.id)) continue
      blocks.push({ kind: "CLUB", label: `Kulüp · ${sel.club.name}`, ...pick(s) })
    }
  }
  for (const m of groupMemberships) {
    for (const s of m.clubGroup.schedules) {
      if (excluded.has(s.id)) continue
      blocks.push({
        kind: "CLUB",
        label: `Kulüp · ${m.clubGroup.club.name} / ${m.clubGroup.name}`,
        ...pick(s),
      })
    }
  }
  for (const e of exams) {
    blocks.push({ kind: "GRADE_EXAM", label: `Sınıf denemesi · ${e.title}`, ...pick(e) })
  }
  return blocks
}

function pick(s: ScheduleBlock): ScheduleBlock {
  return { dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime }
}

export async function checkStudentClubAdd(options: {
  studentId: string
  clubId: string
  maxAlternatives?: number
}): Promise<StudentClubAddCheck | { error: string; status: number }> {
  const { studentId, clubId, maxAlternatives = 6 } = options

  const [student, club] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, firstName: true, lastName: true, grade: true },
    }),
    prisma.club.findUnique({
      where: { id: clubId },
      select: {
        id: true,
        name: true,
        schedules: {
          where: { isActive: true },
          select: { clubGroupId: true, dayOfWeek: true, startTime: true, endTime: true },
        },
      },
    }),
  ])
  if (!student) return { error: "Öğrenci bulunamadı", status: 404 }
  if (!club) return { error: "Kulüp bulunamadı", status: 404 }

  const gradeLevel = parseStudentGradeLevel(student.grade)
  const targetBlocks = clubBlocks(club.schedules)
  const busy = await loadStudentBusyBlocks(studentId, gradeLevel, clubId)

  const conflicts: ClubAddConflict[] = []
  for (const tb of targetBlocks) {
    for (const bb of busy) {
      if (!scheduleBlocksConflict(tb, bb)) continue
      conflicts.push({
        dayOfWeek: tb.dayOfWeek,
        dayLabel: DAY_LABELS[tb.dayOfWeek] || String(tb.dayOfWeek),
        clubTime: `${tb.startTime}–${tb.endTime}`,
        with: { ...bb, time: `${bb.startTime}–${bb.endTime}` },
      })
    }
  }

  const base: StudentClubAddCheck = {
    studentId,
    studentName: `${student.firstName} ${student.lastName}`,
    clubId,
    clubName: club.name,
    clubHasSchedule: targetBlocks.length > 0,
    clubSchedule: targetBlocks.map(fmt),
    conflicts,
    alternatives: [],
  }
  if (conflicts.length === 0) return base

  // Alternatif kulüpler: sınıf düzeyine uygun, kontenjanı olan, programı tanımlı,
  // öğrencinin mevcut programıyla çakışmayan ve öğrencinin zaten üyesi olmadığı kulüpler.
  const memberClubIds = new Set(
    (
      await prisma.clubSelection.findMany({
        where: { studentId },
        select: { clubId: true },
      })
    ).map((s) => s.clubId)
  )

  const candidates = await prisma.club.findMany({
    where: { id: { notIn: [clubId, ...memberClubIds] } },
    select: {
      id: true,
      name: true,
      capacity: true,
      gradeLevels: true,
      instructor: { select: { firstName: true, lastName: true } },
      schedules: {
        where: { isActive: true },
        select: { clubGroupId: true, dayOfWeek: true, startTime: true, endTime: true },
      },
      _count: { select: { selections: true } },
    },
    orderBy: { name: "asc" },
  })

  const alternatives: AlternativeClub[] = []
  for (const c of candidates) {
    if (!clubMatchesStudentGrade(c.gradeLevels, student.grade)) continue
    if (c._count.selections >= c.capacity) continue
    const blocks = clubBlocks(c.schedules)
    if (blocks.length === 0) continue
    if (blocks.some((cb) => busy.some((bb) => scheduleBlocksConflict(cb, bb)))) continue
    alternatives.push({
      clubId: c.id,
      clubName: c.name,
      teacherName: c.instructor ? `${c.instructor.firstName} ${c.instructor.lastName}` : null,
      memberCount: c._count.selections,
      capacity: c.capacity,
      schedule: blocks.map(fmt),
      sameSlotAsTarget: blocks.some((cb) => targetBlocks.some((tb) => scheduleBlocksConflict(cb, tb))),
    })
  }

  alternatives.sort(
    (a, b) =>
      Number(b.sameSlotAsTarget) - Number(a.sameSlotAsTarget) ||
      b.capacity - b.memberCount - (a.capacity - a.memberCount) ||
      a.clubName.localeCompare(b.clubName, "tr")
  )

  return { ...base, alternatives: alternatives.slice(0, maxAlternatives) }
}

export const CLUB_ADD_CONFLICT_CODE = "SCHEDULE_CONFLICT"

/**
 * Ekleme öncesi sunucu kontrolü. Çakışma varsa eklemeyi engellemek için
 * 409 gövdesi döner (uyarı penceresi `check` alanını kullanır); yoksa null.
 */
export async function blockIfClubAddConflict(options: {
  studentId: string
  clubId: string
}): Promise<{ error: string; code: typeof CLUB_ADD_CONFLICT_CODE; check: StudentClubAddCheck } | null> {
  const check = await checkStudentClubAdd(options)
  if ("error" in check || check.conflicts.length === 0) return null
  const first = check.conflicts[0]!
  const more = check.conflicts.length > 1 ? ` (+${check.conflicts.length - 1} çakışma daha)` : ""
  return {
    error: `${check.studentName}, ${check.clubName} saatinde başka bir programa kayıtlı: ${first.dayLabel} ${first.clubTime} ↔ ${first.with.label}${more}. Öğrenci bu kulübe eklenemez.`,
    code: CLUB_ADD_CONFLICT_CODE,
    check,
  }
}
