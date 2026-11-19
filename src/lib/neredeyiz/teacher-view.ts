import { prisma } from "@/lib/prisma"
import { addDays, todayKey, topicScopeOf } from "@/lib/neredeyiz/calendar"
import {
  currentWeek,
  evaluateWeeklyTopic,
  formatDayTr,
  LATE_REASON_LABELS,
  loadYearContexts,
  teachingWeekCount,
  type AcademicWeek,
  type TopicWeeklyEval,
} from "@/lib/neredeyiz/weeks"

/** Öğretmenin bir yıldaki dersleri, konuları, tamamlama kayıtları ve notları. */
export async function loadTeacherSubjects(staffId: string, academicYearId: string, subjectId?: string) {
  return prisma.subject.findMany({
    where: {
      academicYearId,
      assignments: { some: { staffId } },
      ...(subjectId ? { id: subjectId } : {}),
    },
    orderBy: [{ grade: "asc" }, { section: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      grade: true,
      section: true,
      classId: true,
      academicYearId: true,
      class: { select: { name: true } },
      assignments: { select: { staffId: true } },
      notes: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, topicId: true, text: true, createdAt: true, authorId: true },
      },
      units: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          name: true,
          order: true,
          topics: {
            orderBy: { order: "asc" },
            select: { id: true, name: true, order: true, plannedStartWeek: true, plannedEndWeek: true, completion: true },
          },
        },
      },
    },
  })
}

export type TeacherSubject = Awaited<ReturnType<typeof loadTeacherSubjects>>[number]

export function classLabel(s: { class: { name: string } | null; grade: number; section: string | null }): string {
  return s.class?.name ?? `${s.grade}${s.section ? `/${s.section}` : ""}`
}

export type TopicView = {
  id: string
  name: string
  unitName: string
  rangeLabel: string
  plannedEndLabel: string | null
  state: TopicWeeklyEval["state"]
  lateDays: number
  completedOn: string | null
  completedKey: string | null
  lateReason: string | null
  lateReasonLabel: string | null
  note: string | null
  guidanceNotes: Array<{ id: string; text: string; createdAt: string }>
}

export function topicView(
  subject: TeacherSubject,
  unit: TeacherSubject["units"][number],
  topic: TeacherSubject["units"][number]["topics"][number],
  ev: TopicWeeklyEval,
): TopicView {
  return {
    id: topic.id,
    name: topic.name,
    unitName: unit.name,
    rangeLabel: ev.rangeLabel,
    plannedEndLabel: ev.plannedEndKey ? formatDayTr(ev.plannedEndKey) : null,
    state: ev.state,
    lateDays: ev.lateDays,
    completedKey: ev.completedKey,
    completedOn: ev.completedKey ? formatDayTr(ev.completedKey) : null,
    lateReason: topic.completion?.lateReason ?? null,
    lateReasonLabel: topic.completion?.lateReason ? LATE_REASON_LABELS[topic.completion.lateReason] : null,
    note: topic.completion?.note ?? null,
    guidanceNotes: subject.notes
      .filter((n) => n.topicId === topic.id)
      .map((n) => ({ id: n.id, text: n.text, createdAt: n.createdAt.toISOString() })),
  }
}

export async function teacherYearContext(academicYearId: string) {
  const ctx = (await loadYearContexts([academicYearId])).get(academicYearId)!
  const today = todayKey()
  const cw = currentWeek(ctx.weeks, today)
  return { ...ctx, today, currentWeek: cw, totalWeeks: teachingWeekCount(ctx.weeks) }
}

export function weekInfo(w: AcademicWeek | null) {
  if (!w) return null
  return { index: w.index, label: w.label, isBreak: w.isBreak, mondayKey: w.mondayKey, sundayKey: addDays(w.mondayKey, 6) }
}

export function evaluateSubjectTopics(
  subject: TeacherSubject,
  ctx: { weeks: AcademicWeek[]; cal: Parameters<typeof evaluateWeeklyTopic>[3]; today: string },
) {
  const scope = topicScopeOf(subject)
  return subject.units.flatMap((unit) =>
    unit.topics.map((topic) => {
      const ev = evaluateWeeklyTopic(topic, topic.completion, ctx.weeks, ctx.cal, scope, ctx.today)
      return { unit, topic, ev, view: topicView(subject, unit, topic, ev) }
    }),
  )
}
