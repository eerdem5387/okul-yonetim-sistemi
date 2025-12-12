import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const staffId = searchParams.get("staffId")
    const academicYearId = searchParams.get("academicYearId")

    if (!staffId) {
      return NextResponse.json({ error: "Staff ID is required" }, { status: 400 })
    }

    // Öğretmeni getir
    const teacher = await prisma.staff.findUnique({
      where: { id: staffId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        tcNumber: true,
        department: true,
      },
    })

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 })
    }

    // Öğretmene atanmış dersleri getir
    const assignments = await prisma.subjectAssignment.findMany({
      where: {
        staffId: staffId,
        ...(academicYearId && {
          subject: {
            academicYearId: academicYearId,
          },
        }),
      },
      include: {
        subject: {
          include: {
            units: {
              include: {
                topics: {
                  include: {
                    progress: {
                      orderBy: { createdAt: "desc" },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    // İstatistikleri hesapla
    const subjects = assignments.map((assignment) => {
      const subject = assignment.subject
      const allTopics = subject.units.flatMap((u) => u.topics)
      
      const completedTopics = allTopics.filter((t) => t.progress[0]?.status === "TAMAMLANDI").length
      const inProgressTopics = allTopics.filter((t) => {
        const progress = t.progress[0]
        if (!progress) return false
        if (progress.status === "DEVAM_EDIYOR") return true
        if (!t.plannedStartDate || !t.plannedEndDate) return false
        const now = new Date()
        now.setHours(0, 0, 0, 0)
        const plannedStart = new Date(t.plannedStartDate)
        const plannedEnd = new Date(t.plannedEndDate)
        plannedStart.setHours(0, 0, 0, 0)
        plannedEnd.setHours(0, 0, 0, 0)
        return now >= plannedStart && now <= plannedEnd && progress.status !== "TAMAMLANDI"
      }).length

      const delayedTopics = allTopics.filter((t) => {
        const progress = t.progress[0]
        if (!t.plannedEndDate) return false
        const now = new Date()
        now.setHours(0, 0, 0, 0)
        const plannedEnd = new Date(t.plannedEndDate)
        plannedEnd.setHours(0, 0, 0, 0)
        
        if (now > plannedEnd) {
          if (!progress || progress.status !== "TAMAMLANDI") {
            return true
          }
          if (progress.status === "TAMAMLANDI" && progress.actualEndDate) {
            const actualEnd = new Date(progress.actualEndDate)
            actualEnd.setHours(0, 0, 0, 0)
            return actualEnd > plannedEnd
          }
        }
        return false
      }).length

      const totalTopics = allTopics.length
      const completionRate = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0

      return {
        subjectId: subject.id,
        subjectName: subject.name,
        grade: subject.grade,
        section: subject.section,
        totalTopics,
        completedTopics,
        inProgressTopics,
        delayedTopics,
        completionRate,
      }
    })

    const totalTopics = subjects.reduce((sum, s) => sum + s.totalTopics, 0)
    const totalCompleted = subjects.reduce((sum, s) => sum + s.completedTopics, 0)
    const totalInProgress = subjects.reduce((sum, s) => sum + s.inProgressTopics, 0)
    const totalDelayed = subjects.reduce((sum, s) => sum + s.delayedTopics, 0)
    const overallCompletionRate = totalTopics > 0 ? Math.round((totalCompleted / totalTopics) * 100) : 0

    return NextResponse.json({
      teacher,
      subjects,
      summary: {
        totalSubjects: subjects.length,
        totalTopics,
        completedTopics: totalCompleted,
        inProgressTopics: totalInProgress,
        delayedTopics: totalDelayed,
        completionRate: overallCompletionRate,
      },
    })
  } catch (error) {
    console.error("Error fetching teacher performance:", error)
    return NextResponse.json(
      { error: "Failed to fetch teacher performance" },
      { status: 500 }
    )
  }
}

