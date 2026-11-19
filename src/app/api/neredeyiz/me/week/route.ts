import { NextRequest, NextResponse } from "next/server"
import { requireStaff } from "@/lib/neredeyiz/access"
import { resolveNeredeyizYearId } from "@/lib/neredeyiz/year-scope"
import { classLabel, evaluateSubjectTopics, loadTeacherSubjects, teacherYearContext, weekInfo } from "@/lib/neredeyiz/teacher-view"

/**
 * GET /api/neredeyiz/me/week — Öğretmenin "Bu hafta" ekranı.
 * Her sınıf-ders için: geciken konular, bu hafta biten konular ve bu hafta tamamlananlar.
 */
export async function GET(request: NextRequest) {
  const guard = await requireStaff(request)
  if (!guard.ok) return guard.response
  try {
    const academicYearId = await resolveNeredeyizYearId(request.nextUrl.searchParams)
    if (!academicYearId) return NextResponse.json({ error: "Aktif akademik yıl bulunamadı" }, { status: 404 })

    const [subjects, ctx] = await Promise.all([
      loadTeacherSubjects(guard.actor.staffId, academicYearId),
      teacherYearContext(academicYearId),
    ])
    const week = weekInfo(ctx.currentWeek)

    let dueCount = 0
    let doneThisWeek = 0
    let lateCount = 0
    const cards = subjects
      .map((subject) => {
        const rows = evaluateSubjectTopics(subject, ctx)
        const topics = rows
          .filter(({ ev }) => {
            const doneInWeek =
              !!ev.completedKey && !!week && ev.completedKey >= week.mondayKey && ev.completedKey <= week.sundayKey
            return ev.state === "GECIKTI" || ev.state === "BU_HAFTA" || doneInWeek
          })
          .map(({ ev, view }) => {
            if (ev.state === "BU_HAFTA") dueCount++
            if (ev.state === "GECIKTI") lateCount++
            if (ev.completedKey && week && ev.completedKey >= week.mondayKey) {
              doneThisWeek++
              if (ev.state === "TAMAMLANDI" || ev.state === "GEC_TAMAMLANDI") dueCount++
            }
            return view
          })
          // Gecikenler önce
          .sort((a, b) => Number(b.state === "GECIKTI") - Number(a.state === "GECIKTI"))
        return {
          subjectId: subject.id,
          className: classLabel(subject),
          subjectName: subject.name,
          hasPlan: rows.some(({ ev }) => ev.state !== "PLANSIZ"),
          topics,
        }
      })
      .filter((c) => c.topics.length > 0 || !c.hasPlan)

    return NextResponse.json({
      academicYearId,
      week,
      summary: { dueCount, doneThisWeek, lateCount },
      cards,
    })
  } catch (error) {
    console.error("me/week", error)
    return NextResponse.json({ error: "Haftalık görünüm yüklenemedi" }, { status: 500 })
  }
}
