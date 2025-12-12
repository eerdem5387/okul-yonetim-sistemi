import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - Gecikmeli konuları detaylı şekilde getir
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
            subject: true,
          },
        },
        progress: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    })

    const now = new Date()
    now.setHours(0, 0, 0, 0)

    // Gecikmeli konuları topla
    const delayedTopics: Array<{
      id: string
      name: string
      plannedStartDate: string | null
      plannedEndDate: string | null
      delayDays: number
      unit: {
        id: string
        name: string
      }
      subject: {
        id: string
        name: string
        grade: number
        section: string | null
      }
      progress: Array<{
        id: string
        status: string
        actualEndDate: string | null
      }>
    }> = []

    topics.forEach((topic) => {
      if (!topic.plannedEndDate) return

      const plannedEnd = new Date(topic.plannedEndDate)
      plannedEnd.setHours(0, 0, 0, 0)

      // Eğer planlanan bitiş tarihi geçmişse
      if (now > plannedEnd) {
        const progress = topic.progress?.[0]

        // Tamamlanmamış veya gecikmeli tamamlanmış
        if (!progress || progress.status !== "TAMAMLANDI") {
          const delayDays = Math.floor(
            (now.getTime() - plannedEnd.getTime()) / (1000 * 60 * 60 * 24)
          )

          delayedTopics.push({
            id: topic.id,
            name: topic.name,
            plannedStartDate: topic.plannedStartDate
              ? topic.plannedStartDate.toISOString()
              : null,
            plannedEndDate: topic.plannedEndDate.toISOString(),
            delayDays,
            unit: {
              id: topic.unit.id,
              name: topic.unit.name,
            },
            subject: {
              id: topic.unit.subject.id,
              name: topic.unit.subject.name,
              grade: topic.unit.subject.grade,
              section: topic.unit.subject.section,
            },
            progress: (topic.progress || []).map((p) => ({
              id: p.id,
              status: p.status,
              actualEndDate: p.actualEndDate ? p.actualEndDate.toISOString() : null,
            })),
          })
        } else if (progress.status === "TAMAMLANDI" && progress.actualEndDate) {
          // Gecikmeli tamamlanmış konular
          const actualEnd = new Date(progress.actualEndDate)
          actualEnd.setHours(0, 0, 0, 0)

          if (actualEnd > plannedEnd) {
            const delayDays = Math.floor(
              (actualEnd.getTime() - plannedEnd.getTime()) / (1000 * 60 * 60 * 24)
            )

            delayedTopics.push({
              id: topic.id,
              name: topic.name,
              plannedStartDate: topic.plannedStartDate
                ? topic.plannedStartDate.toISOString()
                : null,
              plannedEndDate: topic.plannedEndDate.toISOString(),
              delayDays,
              unit: {
                id: topic.unit.id,
                name: topic.unit.name,
              },
              subject: {
                id: topic.unit.subject.id,
                name: topic.unit.subject.name,
                grade: topic.unit.subject.grade,
                section: topic.unit.subject.section,
              },
              progress: (topic.progress || []).map((p) => ({
                id: p.id,
                status: p.status,
                actualEndDate: p.actualEndDate ? p.actualEndDate.toISOString() : null,
              })),
            })
          }
        }
      }
    })

    // Gecikme gününe göre sırala (en çok gecikme önce)
    delayedTopics.sort((a, b) => b.delayDays - a.delayDays)

    return NextResponse.json({
      delayedTopics,
      summary: {
        totalDelayed: delayedTopics.length,
        totalDelayDays: delayedTopics.reduce((sum, t) => sum + t.delayDays, 0),
        averageDelayDays:
          delayedTopics.length > 0
            ? Math.round(
                delayedTopics.reduce((sum, t) => sum + t.delayDays, 0) /
                  delayedTopics.length
              )
            : 0,
      },
    })
  } catch (error) {
    console.error("Error fetching delayed topics:", error)
    return NextResponse.json(
      { error: "Gecikmeli konular getirilirken hata oluştu" },
      { status: 500 }
    )
  }
}

