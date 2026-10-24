import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ classId: string }> }
) {
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
        where: { classId },
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
                include: {
                  progress: { orderBy: { createdAt: "desc" }, take: 1 },
                },
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

    const visibleDisruptions = disruptions.filter((d) => {
      if (d.scope === "SCHOOL") return true
      if (d.scope === "CLASSES") return d.affectedClassIds.includes(classId)
      if (d.scope === "SUBJECTS") {
        const ids = new Set(subjects.map((s) => s.id))
        return d.affectedSubjects.some((id) => ids.has(id))
      }
      if (d.scope === "TEACHER") {
        const staff = new Set(
          subjects.flatMap((s) => s.assignments.map((a) => a.staff.id))
        )
        return d.affectedStaffIds.some((id) => staff.has(id))
      }
      return false
    })

    return NextResponse.json({
      class: classData,
      subjects,
      holidays,
      disruptions: visibleDisruptions,
      siblingClasses,
    })
  } catch (error) {
    console.error("class plan", error)
    return NextResponse.json({ error: "Sınıf planı yüklenemedi" }, { status: 500 })
  }
}
