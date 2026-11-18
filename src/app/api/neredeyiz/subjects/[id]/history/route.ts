import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { forbidden, requireNeredeyiz } from "@/lib/neredeyiz/access"
import { dayKey, disruptionAffects, todayKey, topicScopeOf } from "@/lib/neredeyiz/calendar"
import { classLabel, evaluateSubjectTopics, teacherYearContext } from "@/lib/neredeyiz/teacher-view"
import { formatDayTr, formatRangeTr, LATE_REASON_LABELS } from "@/lib/neredeyiz/weeks"

/** GET — Bir sınıf-dersin konu geçmişi: her konunun planı, tamamlanması, durumu; notlar ve olaylar. */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const guard = await requireNeredeyiz(request, "view")
  if (!guard.ok) return guard.response
  try {
    const { id } = await context.params
    const subject = await prisma.subject.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        grade: true,
        section: true,
        classId: true,
        academicYearId: true,
        class: { select: { name: true, counselor: { select: { firstName: true, lastName: true } } } },
        assignments: { select: { staffId: true, staff: { select: { firstName: true, lastName: true } } } },
        notes: { orderBy: { createdAt: "desc" }, take: 50, select: { id: true, topicId: true, text: true, createdAt: true, authorId: true } },
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
    if (!subject) return NextResponse.json({ error: "Ders bulunamadı" }, { status: 404 })
    const actor = guard.actor
    if (actor.isTeacher && !actor.superAdmin && !subject.assignments.some((a) => a.staffId === actor.staffId)) {
      return forbidden("Bu derse atanmamışsınız.")
    }

    const ctx = await teacherYearContext(subject.academicYearId)
    const rows = evaluateSubjectTopics(subject, ctx)

    const authorIds = [...new Set(subject.notes.map((n) => n.authorId))]
    const completerIds = [...new Set(rows.map((r) => r.topic.completion?.completedBy).filter((x): x is string => !!x))]
    const people = await prisma.staff.findMany({
      where: { id: { in: [...authorIds, ...completerIds] } },
      select: { id: true, firstName: true, lastName: true },
    })
    const nameOf = new Map(people.map((p) => [p.id, `${p.firstName} ${p.lastName}`]))

    // Olaylar: gecikmeler, geç tamamlamalar, bu dersi etkileyen aksamalar, öğretmen değişiklikleri
    const scope = topicScopeOf(subject)
    const [disruptions, scheduleChanges] = await Promise.all([
      prisma.disruption.findMany({ where: { academicYearId: subject.academicYearId }, orderBy: { startDate: "desc" } }),
      subject.classId
        ? prisma.scheduleChange.findMany({
            where: { classId: subject.classId, subjectName: subject.name },
            orderBy: { createdAt: "desc" },
            take: 20,
          })
        : Promise.resolve([]),
    ])
    const events: Array<{ key: string; kind: string; when: string; who: string; text: string }> = []
    for (const r of rows) {
      if (r.ev.state === "GECIKTI") {
        events.push({ key: r.ev.plannedEndKey ?? todayKey(), kind: "late", when: r.ev.rangeLabel, who: "Sistem", text: `"${r.topic.name}" planlanan aralıkta tamamlanmadı (${r.ev.lateDays} ders günü).` })
      }
      if (r.ev.state === "GEC_TAMAMLANDI" && r.topic.completion) {
        const c = r.topic.completion
        events.push({
          key: r.ev.completedKey!,
          kind: "lateDone",
          when: formatDayTr(r.ev.completedKey!),
          who: c.completedBy ? nameOf.get(c.completedBy) ?? "Öğretmen" : "Öğretmen",
          text: `"${r.topic.name}" ${r.ev.lateDays} ders günü geç tamamlandı · ${c.lateReason ? LATE_REASON_LABELS[c.lateReason] : ""}${c.note ? ` — "${c.note}"` : ""}`,
        })
      }
    }
    for (const d of disruptions) {
      const cal = ctx.cal.disruptions.find((x) => x.startKey === dayKey(d.startDate) && x.endKey === dayKey(d.endDate) && x.scope === d.scope)
      if (cal && disruptionAffects(cal, scope)) {
        events.push({ key: dayKey(d.startDate), kind: "disruption", when: formatRangeTr(dayKey(d.startDate), dayKey(d.endDate)), who: "Aksama", text: `${d.reason} — bu günler gecikmeye sayılmaz.` })
      }
    }
    for (const c of scheduleChanges) {
      const k = dayKey(c.createdAt)
      events.push({
        key: k,
        kind: "schedule",
        when: formatDayTr(k),
        who: "Ders programı",
        text: c.kind === "ADDED" ? "Derse öğretmen/saat eklendi." : c.kind === "REMOVED" ? "Dersin bir saati ya da öğretmeni kaldırıldı." : "Dersin saati değişti.",
      })
    }
    events.sort((a, b) => b.key.localeCompare(a.key))

    const count = (s: string) => rows.filter((r) => r.ev.state === s).length
    return NextResponse.json({
      subject: {
        id: subject.id,
        className: classLabel(subject),
        subjectName: subject.name,
        teachers: subject.assignments.map((a) => `${a.staff.firstName} ${a.staff.lastName}`),
        counselor: subject.class?.counselor ? `${subject.class.counselor.firstName} ${subject.class.counselor.lastName}` : null,
      },
      week: ctx.currentWeek ? { index: ctx.currentWeek.index, label: ctx.currentWeek.label } : null,
      counts: {
        onTime: count("TAMAMLANDI"),
        lateDone: count("GEC_TAMAMLANDI"),
        late: count("GECIKTI"),
        thisWeek: count("BU_HAFTA"),
        upcoming: count("PLANLANDI"),
        unplanned: count("PLANSIZ"),
      },
      topics: rows.map((r) => ({
        ...r.view,
        completedByName: r.topic.completion?.completedBy ? nameOf.get(r.topic.completion.completedBy) ?? null : null,
      })),
      notes: subject.notes.map((n) => ({
        id: n.id,
        topicId: n.topicId,
        text: n.text,
        createdAt: n.createdAt.toISOString(),
        authorName: nameOf.get(n.authorId) ?? null,
      })),
      events: events.slice(0, 30),
    })
  } catch (error) {
    console.error("subject history", error)
    return NextResponse.json({ error: "Konu geçmişi yüklenemedi" }, { status: 500 })
  }
}
