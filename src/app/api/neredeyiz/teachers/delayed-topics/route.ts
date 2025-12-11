import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - Öğretmenin atandığı derslerdeki gecikme yaşanan konuları getir
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const staffId = searchParams.get("staffId")

    if (!staffId) {
      return NextResponse.json(
        { error: "Öğretmen ID zorunludur" },
        { status: 400 }
      )
    }

    // Öğretmenin atandığı dersleri getir
    const assignedSubjects = await prisma.subject.findMany({
      where: {
        assignments: {
          some: {
            staffId: staffId,
          },
        },
      },
      include: {
        academicYear: {
          select: {
            id: true,
            name: true,
          },
        },
        units: {
          include: {
            topics: {
              include: {
                progress: true,
              },
            },
          },
        },
      },
    })

    const now = new Date()
    now.setHours(0, 0, 0, 0)

    // Gecikme yaşanan konuları topla
    const delayedTopics: Array<{
      id: string
      name: string
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
        academicYear: {
          id: string
          name: string
        }
      }
      progress: Array<{
        id: string
        status: string
        actualEndDate: string | null
      }>
    }> = []

    assignedSubjects.forEach((subject) => {
      subject.units.forEach((unit) => {
        unit.topics.forEach((topic) => {
          // Gecikme kontrolü
          if (topic.plannedEndDate) {
            const plannedEnd = new Date(topic.plannedEndDate)
            plannedEnd.setHours(0, 0, 0, 0)

              // Eğer planlanan bitiş tarihi geçmişse ve konu tamamlanmamışsa
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
                  plannedEndDate: topic.plannedEndDate ? topic.plannedEndDate.toISOString() : null,
                  delayDays,
                  unit: {
                    id: unit.id,
                    name: unit.name,
                  },
                  subject: {
                    id: subject.id,
                    name: subject.name,
                    grade: subject.grade,
                    section: subject.section,
                    academicYear: {
                      id: subject.academicYear.id,
                      name: subject.academicYear.name,
                    },
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
                    plannedEndDate: topic.plannedEndDate ? topic.plannedEndDate.toISOString() : null,
                    delayDays,
                    unit: {
                      id: unit.id,
                      name: unit.name,
                    },
                    subject: {
                      id: subject.id,
                      name: subject.name,
                      grade: subject.grade,
                      section: subject.section,
                      academicYear: {
                        id: subject.academicYear.id,
                        name: subject.academicYear.name,
                      },
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
          }
        })
      })
    })

    // Gecikme gününe göre sırala (en çok gecikme olanlar önce)
    delayedTopics.sort((a, b) => b.delayDays - a.delayDays)

    // Ders bazında grupla
    const groupedBySubject: Record<
      string,
      {
        subject: {
          id: string
          name: string
          grade: number
          section: string | null
          academicYear: {
            id: string
            name: string
          }
        }
        delayedTopics: typeof delayedTopics
        totalDelayDays: number
      }
    > = {}

    delayedTopics.forEach((topic) => {
      const subjectId = topic.subject.id
      if (!groupedBySubject[subjectId]) {
        groupedBySubject[subjectId] = {
          subject: topic.subject,
          delayedTopics: [],
          totalDelayDays: 0,
        }
      }
      groupedBySubject[subjectId].delayedTopics.push(topic)
      groupedBySubject[subjectId].totalDelayDays += topic.delayDays
    })

    return NextResponse.json({
      delayedTopics,
      groupedBySubject: Object.values(groupedBySubject),
      summary: {
        totalDelayedTopics: delayedTopics.length,
        totalSubjects: Object.keys(groupedBySubject).length,
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
      { error: "Gecikme yaşanan konular getirilirken hata oluştu" },
      { status: 500 }
    )
  }
}

