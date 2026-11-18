import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { canQueryStaff, forbidden, requireNeredeyiz } from "@/lib/neredeyiz/access"
import { evaluateTopics } from "@/lib/neredeyiz/calendar"
import { resolveNeredeyizYearId } from "@/lib/neredeyiz/year-scope"

// GET - Öğretmen performansı (aktif ya da seçilen akademik yıl)
export async function GET(request: NextRequest) {
  const guard = await requireNeredeyiz(request, "view")
  if (!guard.ok) return guard.response
  try {
    const searchParams = request.nextUrl.searchParams
    const staffId = searchParams.get("staffId") || guard.actor.staffId
    if (!canQueryStaff(guard.actor, staffId)) return forbidden("Yalnızca kendi performansınızı görüntüleyebilirsiniz.")
    const academicYearId = await resolveNeredeyizYearId(searchParams)

    const teacher = await prisma.staff.findUnique({
      where: { id: staffId },
      select: { id: true, firstName: true, lastName: true, department: true },
    })
    if (!teacher) return NextResponse.json({ error: "Öğretmen bulunamadı" }, { status: 404 })

    const subjects = await prisma.subject.findMany({
      where: {
        assignments: { some: { staffId } },
        ...(academicYearId ? { academicYearId } : {}),
      },
      select: {
        id: true,
        name: true,
        grade: true,
        section: true,
        classId: true,
        academicYearId: true,
        assignments: { select: { staffId: true } },
        units: {
          select: {
            topics: {
              select: {
                id: true,
                plannedStartDate: true,
                plannedEndDate: true,
                progress: { orderBy: { updatedAt: "desc" }, take: 1 },
              },
            },
          },
        },
      },
    })

    const rows = await Promise.all(
      subjects.map(async (subject) => {
        const topics = subject.units.flatMap((u) => u.topics)
        const evaluated = await evaluateTopics(
          topics,
          () => subject,
          (t) => t.progress[0],
        )
        const totalTopics = topics.length
        const completedTopics = evaluated.filter((e) => e.ev.completed).length
        return {
          subjectId: subject.id,
          subjectName: subject.name,
          grade: subject.grade,
          section: subject.section,
          totalTopics,
          completedTopics,
          pendingApprovalTopics: evaluated.filter((e) => e.ev.pendingApproval).length,
          inProgressTopics: evaluated.filter((e) => e.ev.state === "DEVAM_EDIYOR").length,
          delayedTopics: evaluated.filter((e) => e.ev.delayed || e.ev.state === "GECIKMELI_TAMAMLANDI").length,
          completionRate: totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0,
        }
      }),
    )

    const sum = (k: "totalTopics" | "completedTopics" | "inProgressTopics" | "delayedTopics" | "pendingApprovalTopics") =>
      rows.reduce((acc, r) => acc + r[k], 0)
    const totalTopics = sum("totalTopics")
    const completed = sum("completedTopics")

    return NextResponse.json({
      academicYearId,
      teacher,
      subjects: rows,
      summary: {
        totalSubjects: rows.length,
        totalTopics,
        completedTopics: completed,
        inProgressTopics: sum("inProgressTopics"),
        pendingApprovalTopics: sum("pendingApprovalTopics"),
        delayedTopics: sum("delayedTopics"),
        completionRate: totalTopics > 0 ? Math.round((completed / totalTopics) * 100) : 0,
      },
    })
  } catch (error) {
    console.error("Error fetching teacher performance:", error)
    return NextResponse.json({ error: "Öğretmen performansı alınamadı" }, { status: 500 })
  }
}
