import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - Gantt takvimi için tüm konuları getir
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const academicYearId = searchParams.get("academicYearId")
    const grade = searchParams.get("grade")
    const section = searchParams.get("section")
    const subjectId = searchParams.get("subjectId")

    if (!academicYearId) {
      return NextResponse.json(
        { error: "Akademik yıl ID zorunludur" },
        { status: 400 }
      )
    }

    // Tüm konuları getir
    const subjectWhere: Record<string, unknown> = {
      academicYearId,
    }

    if (grade) {
      subjectWhere.grade = parseInt(grade, 10)
    }
    if (section) {
      subjectWhere.section = section
    }

    const where: Record<string, unknown> = {
      unit: {
        subject: subjectWhere,
      },
      // Sadece tarih aralığı olan konuları getir
      plannedStartDate: { not: null },
      plannedEndDate: { not: null },
    }

    if (subjectId) {
      where.unit = {
        subjectId,
      }
    }

    const topics = await prisma.topic.findMany({
      where,
      include: {
        unit: {
          include: {
            subject: {
              include: {
                assignments: {
                  include: {
                    staff: true,
                  },
                },
              },
            },
          },
        },
        progress: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        plannedStartDate: "asc",
      },
    })

    const now = new Date()
    now.setHours(0, 0, 0, 0)

    // Progress kayıtlarındaki Staff ID'lerini topla
    const staffIds = new Set<string>()
    topics.forEach((topic) => {
      topic.progress.forEach((p) => {
        if (p.markedBy) staffIds.add(p.markedBy)
        if (p.approvedBy) staffIds.add(p.approvedBy)
      })
    })

    // Staff bilgilerini çek
    const staffMembers = await prisma.staff.findMany({
      where: {
        id: { in: Array.from(staffIds) },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        department: true,
      },
    })

    // Staff bilgilerini map'e çevir
    const staffMap = new Map(staffMembers.map((s) => [s.id, s]))

    // Konuları Gantt formatına dönüştür
    const ganttTopics = topics.map((topic) => {
      const progress = topic.progress?.[0]
      let status: "PLANLANDI" | "DEVAM_EDIYOR" | "TAMAMLANDI" | "GECIKMELI" | "GECIKMELI_TAMAMLANDI" = "PLANLANDI"
      let delayDays = 0

      if (progress) {
        if (progress.status === "TAMAMLANDI") {
          // Gecikmeli tamamlanma kontrolü
          if (topic.plannedEndDate && progress.actualEndDate) {
            const plannedEnd = new Date(topic.plannedEndDate)
            plannedEnd.setHours(0, 0, 0, 0)
            const actualEnd = new Date(progress.actualEndDate)
            actualEnd.setHours(0, 0, 0, 0)

            if (actualEnd > plannedEnd) {
              status = "GECIKMELI_TAMAMLANDI"
              delayDays = Math.floor(
                (actualEnd.getTime() - plannedEnd.getTime()) / (1000 * 60 * 60 * 24)
              )
            } else {
              status = "TAMAMLANDI"
            }
          } else {
            status = "TAMAMLANDI"
          }
        } else if (progress.status === "DEVAM_EDIYOR") {
          status = "DEVAM_EDIYOR"
        }
      } else {
        // Progress kaydı yoksa, tarihlere göre otomatik belirle
        if (topic.plannedStartDate && topic.plannedEndDate) {
          const startDate = new Date(topic.plannedStartDate)
          startDate.setHours(0, 0, 0, 0)
          const endDate = new Date(topic.plannedEndDate)
          endDate.setHours(0, 0, 0, 0)

          if (startDate <= now && endDate >= now) {
            status = "DEVAM_EDIYOR"
          } else if (endDate < now) {
            status = "GECIKMELI"
            delayDays = Math.floor(
              (now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24)
            )
          } else {
            status = "PLANLANDI"
          }
        }
      }

      // Öğretmen bilgisi
      const teachers = topic.unit.subject.assignments.map((a) => ({
        id: a.staff.id,
        firstName: a.staff.firstName,
        lastName: a.staff.lastName,
      }))

      // Onaylayan ve bildiren rehber bilgisi
      const markedByStaff = progress?.markedBy ? staffMap.get(progress.markedBy) : null
      const approvedByStaff = progress?.approvedBy ? staffMap.get(progress.approvedBy) : null

      return {
        id: topic.id,
        name: topic.name,
        plannedStartDate: topic.plannedStartDate?.toISOString() || null,
        plannedEndDate: topic.plannedEndDate?.toISOString() || null,
        actualEndDate: progress?.actualEndDate?.toISOString() || null,
        status,
        delayDays,
        subject: {
          name: topic.unit.subject.name,
          grade: topic.unit.subject.grade,
          section: topic.unit.subject.section,
        },
        unit: {
          name: topic.unit.name,
        },
        teachers,
        markedByStaff: markedByStaff ? {
          firstName: markedByStaff.firstName,
          lastName: markedByStaff.lastName,
        } : null,
        approvedByStaff: approvedByStaff ? {
          firstName: approvedByStaff.firstName,
          lastName: approvedByStaff.lastName,
        } : null,
      }
    })

    return NextResponse.json({
      topics: ganttTopics,
      summary: {
        total: ganttTopics.length,
        planned: ganttTopics.filter((t) => t.status === "PLANLANDI").length,
        inProgress: ganttTopics.filter((t) => t.status === "DEVAM_EDIYOR").length,
        completed: ganttTopics.filter((t) => t.status === "TAMAMLANDI").length,
        delayed: ganttTopics.filter(
          (t) => t.status === "GECIKMELI" || t.status === "GECIKMELI_TAMAMLANDI"
        ).length,
      },
    })
  } catch (error) {
    console.error("Error fetching Gantt topics:", error)
    return NextResponse.json(
      { error: "Gantt verileri getirilirken hata oluştu" },
      { status: 500 }
    )
  }
}

