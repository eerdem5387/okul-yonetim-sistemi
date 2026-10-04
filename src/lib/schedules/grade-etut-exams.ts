import { prisma } from "@/lib/prisma"
import { DENEME_SINAVI_SUBJECT, normalizeTime } from "@/lib/schedules/lesson-slots"
import { hasTimeConflict } from "@/lib/schedules/time-conflict"
import { loadEtutSlots } from "@/lib/schedules/club-schedule"

export type GradeEtutExamRow = {
  id: string
  grade: number
  dayOfWeek: number
  startTime: string
  endTime: string
  title: string
  notes: string | null
  isActive: boolean
}

export async function listGradeEtutExams(): Promise<GradeEtutExamRow[]> {
  return prisma.gradeEtutExam.findMany({
    where: { isActive: true },
    orderBy: [{ grade: "asc" }, { dayOfWeek: "asc" }, { startTime: "asc" }],
  })
}

export function matchesGradeEtutExam(
  exam: Pick<GradeEtutExamRow, "dayOfWeek" | "startTime" | "endTime" | "grade">,
  options: { grade: number; dayOfWeek: number; startTime: string; endTime: string }
): boolean {
  if (exam.grade !== options.grade) return false
  if (exam.dayOfWeek !== options.dayOfWeek) return false
  return (
    normalizeTime(exam.startTime) === normalizeTime(options.startTime) &&
    normalizeTime(exam.endTime) === normalizeTime(options.endTime)
  )
}

export function findGradeEtutExamForSlot(
  exams: GradeEtutExamRow[],
  options: { grade: number; dayOfWeek: number; startTime: string; endTime: string }
): GradeEtutExamRow | null {
  return (
    exams.find((e) => matchesGradeEtutExam(e, options)) ??
    exams.find(
      (e) =>
        e.grade === options.grade &&
        e.dayOfWeek === options.dayOfWeek &&
        hasTimeConflict(e.startTime, e.endTime, options.startTime, options.endTime)
    ) ??
    null
  )
}

/** Verilen sınıf düzeyleri bu etüt slotunda deneme varsa başlık döner. */
export function gradeEtutExamTitleForLevels(
  exams: GradeEtutExamRow[],
  options: {
    gradeLevels: number[]
    dayOfWeek: number
    startTime: string
    endTime: string
  }
): string | null {
  const levels =
    options.gradeLevels.length > 0 ? options.gradeLevels : [5, 6, 7, 8, 9, 10, 11, 12]
  const hits = exams.filter((e) =>
    levels.some((g) =>
      matchesGradeEtutExam(e, {
        grade: g,
        dayOfWeek: options.dayOfWeek,
        startTime: options.startTime,
        endTime: options.endTime,
      })
    )
  )
  if (hits.length === 0) return null
  const grades = [...new Set(hits.map((h) => h.grade))].sort((a, b) => a - b)
  const title = hits[0]?.title || DENEME_SINAVI_SUBJECT
  return `${grades.map((g) => `${g}.`).join("/")} sınıf · ${title}`
}

export async function assertNoGradeEtutExamConflict(options: {
  gradeLevels: number[]
  dayOfWeek: number
  startTime: string
  endTime: string
}): Promise<string | null> {
  const exams = await listGradeEtutExams()
  const label = gradeEtutExamTitleForLevels(exams, options)
  if (!label) return null
  return `Bu etüt saatinde sınıf düzeyi deneme var: ${label}. Önce denemeyi kaldırın veya başka saat seçin.`
}

export async function assertEtutSlotTimes(
  startTime: string,
  endTime: string
): Promise<string | null> {
  const etuts = await loadEtutSlots()
  if (etuts.length === 0) {
    return "Önce Ders saatleri’nde en az bir Etüt satırı tanımlayın."
  }
  const ok = etuts.some(
    (s) =>
      normalizeTime(s.startTime) === normalizeTime(startTime) &&
      normalizeTime(s.endTime) === normalizeTime(endTime)
  )
  if (!ok) {
    return "Deneme yalnızca tanımlı etüt saatlerine yerleştirilebilir."
  }
  return null
}
