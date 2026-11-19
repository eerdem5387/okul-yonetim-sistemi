import { NextRequest, NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { forbidden, requireNeredeyiz } from "@/lib/neredeyiz/access"
import { addDays, todayKey, topicScopeOf } from "@/lib/neredeyiz/calendar"
import { resolveNeredeyizYearId } from "@/lib/neredeyiz/year-scope"
import { currentWeek, evaluateWeeklyTopic, LATE_REASON_LABELS, loadYearContexts } from "@/lib/neredeyiz/weeks"

type CellState = "ok" | "late" | "lateDone" | "unplanned"

/**
 * GET /api/neredeyiz/board — Rehberlik haftalık panosu.
 * ?academicYearId= (varsayılan aktif) &grade=9 &mine=1 (yalnız rehberi olduğum sınıflar)
 * Hücre: late (planlanan aralığı geçmiş, tamamlanmamış konu var) > lateDone (bu hafta geç tamamlandı) > ok.
 */
export async function GET(request: NextRequest) {
  const guard = await requireNeredeyiz(request, "view")
  if (!guard.ok) return guard.response
  const actor = guard.actor
  if (actor.isTeacher && !actor.superAdmin) return forbidden("Pano rehberlik ve yönetim içindir.")
  try {
    const sp = request.nextUrl.searchParams
    const academicYearId = await resolveNeredeyizYearId(sp)
    if (!academicYearId) return NextResponse.json({ error: "Aktif akademik yıl bulunamadı" }, { status: 404 })
    const grade = Number.parseInt(sp.get("grade") ?? "", 10)
    const mine = sp.get("mine") === "1"

    const classWhere: Prisma.ClassWhereInput = { academicYearId }
    if (Number.isFinite(grade)) classWhere.grade = grade
    if (mine) classWhere.counselorId = actor.staffId

    const [classes, courses, ctxMap] = await Promise.all([
      prisma.class.findMany({
        where: classWhere,
        orderBy: [{ grade: "asc" }, { section: "asc" }],
        select: {
          id: true,
          name: true,
          grade: true,
          subjects: {
            select: {
              id: true,
              name: true,
              classId: true,
              academicYearId: true,
              assignments: { select: { staffId: true, staff: { select: { firstName: true, lastName: true } } } },
              units: {
                select: {
                  topics: {
                    select: { id: true, name: true, plannedStartWeek: true, plannedEndWeek: true, completion: true },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.scheduleCourse.findMany({ select: { name: true, sortOrder: true } }),
      loadYearContexts([academicYearId]),
    ])
    const ctx = ctxMap.get(academicYearId)!
    const today = todayKey()
    const cw = currentWeek(ctx.weeks, today)
    const weekStart = cw?.mondayKey ?? today
    const weekEnd = cw ? addDays(cw.mondayKey, 6) : today

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const reminded = await prisma.notification.findMany({
      where: { type: "HATIRLATMA", createdAt: { gte: since }, relatedSubjectId: { not: null } },
      select: { relatedSubjectId: true },
      distinct: ["relatedSubjectId"],
    })
    const remindedSet = new Set(reminded.map((r) => r.relatedSubjectId))

    const courseOrder = new Map(courses.map((c) => [c.name.toLocaleLowerCase("tr-TR"), c.sortOrder]))
    const subjectNames = [...new Set(classes.flatMap((c) => c.subjects.map((s) => s.name)))].sort((a, b) => {
      const oa = courseOrder.get(a.toLocaleLowerCase("tr-TR")) ?? 999
      const ob = courseOrder.get(b.toLocaleLowerCase("tr-TR")) ?? 999
      return oa - ob || a.localeCompare(b, "tr")
    })

    const lateTopics: Array<Record<string, unknown>> = []
    const lateDoneThisWeek: Array<Record<string, unknown>> = []
    const reasonCounts = new Map<string, number>()
    let okCells = 0
    let totalCells = 0
    let lateCells = 0

    const rows = classes.map((cls) => ({
      classId: cls.id,
      name: cls.name,
      cells: subjectNames.map((name) => {
        const subject = cls.subjects.find((s) => s.name === name)
        if (!subject) return null
        totalCells++
        const scope = topicScopeOf(subject)
        const teachers = subject.assignments.map((a) => `${a.staff.firstName} ${a.staff.lastName}`)
        const evs = subject.units.flatMap((u) =>
          u.topics.map((t) => ({ t, ev: evaluateWeeklyTopic(t, t.completion, ctx.weeks, ctx.cal, scope, today) })),
        )
        const late = evs.filter((e) => e.ev.state === "GECIKTI")
        const lateDone = evs.filter(
          (e) => e.ev.state === "GEC_TAMAMLANDI" && e.ev.completedKey! >= weekStart && e.ev.completedKey! <= weekEnd,
        )
        for (const e of evs) {
          const r = e.t.completion?.lateReason
          if (r) reasonCounts.set(r, (reasonCounts.get(r) ?? 0) + 1)
        }
        for (const e of late) {
          lateTopics.push({
            subjectId: subject.id,
            topicId: e.t.id,
            className: cls.name,
            subjectName: name,
            topicName: e.t.name,
            rangeLabel: e.ev.rangeLabel,
            lateDays: e.ev.lateDays,
            teachers,
            reminded: remindedSet.has(subject.id),
          })
        }
        for (const e of lateDone) {
          lateDoneThisWeek.push({
            subjectId: subject.id,
            className: cls.name,
            subjectName: name,
            topicName: e.t.name,
            reason: e.t.completion?.lateReason ? LATE_REASON_LABELS[e.t.completion.lateReason] : null,
            note: e.t.completion?.note ?? null,
            lateDays: e.ev.lateDays,
          })
        }
        const planned = evs.some((e) => e.ev.state !== "PLANSIZ")
        let state: CellState = planned ? "ok" : "unplanned"
        if (late.length) state = "late"
        else if (lateDone.length) state = "lateDone"
        if (state === "ok") okCells++
        if (state === "late") lateCells++
        return {
          subjectId: subject.id,
          state,
          lateCount: late.length,
          maxLateDays: late.reduce((m, e) => Math.max(m, e.ev.lateDays), 0),
          lateDoneReason:
            lateDone[0]?.t.completion?.lateReason ? LATE_REASON_LABELS[lateDone[0].t.completion.lateReason] : null,
          teachers,
        }
      }),
    }))

    lateTopics.sort((a, b) => (b.lateDays as number) - (a.lateDays as number))
    const topReasons = [...reasonCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, n]) => ({ reason: LATE_REASON_LABELS[k as keyof typeof LATE_REASON_LABELS], count: n }))

    return NextResponse.json({
      academicYearId,
      week: cw ? { index: cw.index, label: cw.label, isBreak: cw.isBreak } : null,
      subjects: subjectNames,
      rows,
      lateTopics,
      lateDoneThisWeek,
      stats: {
        okCells,
        totalCells,
        lateCells,
        lateTopicCount: lateTopics.length,
        lateDoneThisWeekCount: lateDoneThisWeek.length,
        topReasons,
      },
    })
  } catch (error) {
    console.error("board", error)
    return NextResponse.json({ error: "Pano yüklenemedi" }, { status: 500 })
  }
}
