import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireNeredeyiz } from "@/lib/neredeyiz/access"
import { buildCalendar, disruptionAffects, todayKey, topicScopeOf } from "@/lib/neredeyiz/calendar"
import { buildAcademicWeeks, evaluateWeeklyTopic, teachingWeekCount } from "@/lib/neredeyiz/weeks"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ classId: string }> }
) {
  const guard = await requireNeredeyiz(request, "view")
  if (!guard.ok) return guard.response
  const actor = guard.actor
  try {
    const { classId } = await context.params
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        academicYear: {
          select: {
            id: true,
            name: true,
            weekendDays: true,
            term1Start: true,
            term1End: true,
            term2Start: true,
            term2End: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    })
    if (!classData) {
      return NextResponse.json({ error: "Sınıf bulunamadı" }, { status: 404 })
    }

    const [subjects, holidays, disruptions, siblingClasses] = await Promise.all([
      prisma.subject.findMany({
        // Öğretmen yalnız kendi derslerini görür
        where: {
          classId,
          ...(actor.isTeacher && !actor.superAdmin ? { assignments: { some: { staffId: actor.staffId } } } : {}),
        },
        orderBy: { name: "asc" },
        include: {
          assignments: {
            include: { staff: { select: { id: true, firstName: true, lastName: true } } },
          },
          units: {
            orderBy: { order: "asc" },
            include: {
              topics: {
                orderBy: { order: "asc" },
                include: { completion: true },
              },
            },
          },
        },
      }),
      prisma.holiday.findMany({
        where: { academicYearId: classData.academicYearId },
        orderBy: { startDate: "asc" },
      }),
      prisma.disruption.findMany({
        where: { academicYearId: classData.academicYearId },
        orderBy: { startDate: "desc" },
      }),
      prisma.class.findMany({
        where: {
          academicYearId: classData.academicYearId,
          id: { not: classId },
        },
        orderBy: [{ grade: "asc" }, { section: "asc" }],
        select: { id: true, name: true, grade: true, section: true },
      }),
    ])

    const cal = buildCalendar({
      academicYearId: classData.academicYearId,
      startDate: classData.academicYear.startDate,
      endDate: classData.academicYear.endDate,
      weekendDays: classData.academicYear.weekendDays,
      holidays,
      disruptions,
    })
    const visibleDisruptions = disruptions.filter((d, i) =>
      subjects.some((s) => disruptionAffects(cal.disruptions[i]!, topicScopeOf({ id: s.id, classId, assignments: s.assignments }))),
    )

    // Haftalar ve her konunun haftalık durumu
    const weeks = buildAcademicWeeks(cal)
    const today = todayKey()
    const subjectsWithState = subjects.map((s) => {
      const scope = topicScopeOf({ id: s.id, classId, assignments: s.assignments })
      return {
        ...s,
        units: s.units.map((u) => ({
          ...u,
          topics: u.topics.map((t) => ({ ...t, evaluation: evaluateWeeklyTopic(t, t.completion, weeks, cal, scope, today) })),
        })),
      }
    })
    const weekList = weeks
      .filter((w) => w.index != null)
      .map((w) => ({ index: w.index!, label: w.label }))
    const breakList = weeks.filter((w) => w.isBreak).map((w) => w.label)

    return NextResponse.json({
      class: classData,
      subjects: subjectsWithState,
      weeks: weekList,
      totalWeeks: teachingWeekCount(weeks),
      breaks: breakList,
      holidays,
      disruptions: visibleDisruptions,
      siblingClasses,
    })
  } catch (error) {
    console.error("class plan", error)
    return NextResponse.json({ error: "Sınıf planı yüklenemedi" }, { status: 500 })
  }
}
