import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - Öğretmen dashboard verileri
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
                progress: {
                  orderBy: {
                    createdAt: "desc",
                  },
                },
              },
            },
          },
        },
      },
    })

    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const nextWeek = new Date(now)
    nextWeek.setDate(nextWeek.getDate() + 7)

    // İstatistikler
    let totalTopics = 0
    let completedTopics = 0
    let earlyTopics = 0
    let lateCompletedTopics = 0
    let inProgressTopics = 0
    let plannedTopics = 0
    let delayedTopics = 0
    let pendingApprovalTopics = 0
    const upcomingDeadlines: Array<{
      id: string
      name: string
      plannedEndDate: string
      daysUntil: number
      subject: {
        id: string
        name: string
        grade: number
        section: string | null
      }
      unit: {
        id: string
        name: string
      }
    }> = []
    const recentCompletions: Array<{
      id: string
      name: string
      completedDate: string
      isEarly?: boolean
      isLate?: boolean
      daysDifference?: number
      subject: {
        id: string
        name: string
        grade: number
        section: string | null
      }
      unit: {
        id: string
        name: string
      }
    }> = []

    assignedSubjects.forEach((subject) => {
      subject.units.forEach((unit) => {
        unit.topics.forEach((topic) => {
          totalTopics++
          const progress = topic.progress?.[0]

          if (progress) {
            if (progress.status === "TAMAMLANDI") {
              completedTopics++
              
              // Erken veya gecikmeli tamamlanma kontrolü
              if (topic.plannedEndDate && progress.actualEndDate) {
                const plannedEnd = new Date(topic.plannedEndDate)
                plannedEnd.setHours(0, 0, 0, 0)
                const actualEnd = new Date(progress.actualEndDate)
                actualEnd.setHours(0, 0, 0, 0)
                
                if (actualEnd > plannedEnd) {
                  // Gecikmeli tamamlanan
                  lateCompletedTopics++
                } else if (actualEnd < plannedEnd) {
                  // Erken tamamlanan
                  earlyTopics++
                }
              }
              
              // Son 7 gün içinde tamamlananlar
              if (progress.actualEndDate) {
                const completedDate = new Date(progress.actualEndDate)
                const daysAgo = Math.floor(
                  (now.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24)
                )
                if (daysAgo <= 7 && daysAgo >= 0) {
                  // Erken veya geç tamamlanma kontrolü
                  let isEarly = false
                  let isLate = false
                  let daysDifference = 0
                  
                  if (topic.plannedEndDate) {
                    const plannedEnd = new Date(topic.plannedEndDate)
                    plannedEnd.setHours(0, 0, 0, 0)
                    const actualEnd = new Date(progress.actualEndDate)
                    actualEnd.setHours(0, 0, 0, 0)
                    
                    if (actualEnd > plannedEnd) {
                      isLate = true
                      daysDifference = Math.floor(
                        (actualEnd.getTime() - plannedEnd.getTime()) / (1000 * 60 * 60 * 24)
                      )
                    } else if (actualEnd < plannedEnd) {
                      isEarly = true
                      daysDifference = Math.floor(
                        (plannedEnd.getTime() - actualEnd.getTime()) / (1000 * 60 * 60 * 24)
                      )
                    }
                  }
                  
                  recentCompletions.push({
                    id: topic.id,
                    name: topic.name,
                    completedDate: progress.actualEndDate.toISOString(),
                    isEarly,
                    isLate,
                    daysDifference: daysDifference > 0 ? daysDifference : undefined,
                    subject: {
                      id: subject.id,
                      name: subject.name,
                      grade: subject.grade,
                      section: subject.section,
                    },
                    unit: {
                      id: unit.id,
                      name: unit.name,
                    },
                  })
                }
              }
            } else if (progress.status === "DEVAM_EDIYOR") {
              inProgressTopics++
            } else if (progress.status === "PENDING_APPROVAL") {
              pendingApprovalTopics++
            }
          } else {
            plannedTopics++
          }

          // Yaklaşan tarihler (7 gün içinde)
          if (topic.plannedEndDate) {
            const plannedEnd = new Date(topic.plannedEndDate)
            plannedEnd.setHours(0, 0, 0, 0)

            if (plannedEnd >= now && plannedEnd <= nextWeek) {
              const daysUntil = Math.floor(
                (plannedEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
              )

              // Eğer tamamlanmamışsa
              if (!progress || progress.status !== "TAMAMLANDI") {
                upcomingDeadlines.push({
                  id: topic.id,
                  name: topic.name,
                  plannedEndDate: topic.plannedEndDate.toISOString(),
                  daysUntil,
                  subject: {
                    id: subject.id,
                    name: subject.name,
                    grade: subject.grade,
                    section: subject.section,
                  },
                  unit: {
                    id: unit.id,
                    name: unit.name,
                  },
                })
              }
            }
          }

          // Gecikme kontrolü (sadece tamamlanmamış konular için)
          if (topic.plannedEndDate) {
            const plannedEnd = new Date(topic.plannedEndDate)
            plannedEnd.setHours(0, 0, 0, 0)

            if (now > plannedEnd) {
              if (!progress || progress.status !== "TAMAMLANDI") {
                delayedTopics++
              }
            }
          }
        })
      })
    })

    // Yaklaşan tarihleri sırala (en yakın önce)
    upcomingDeadlines.sort((a, b) => a.daysUntil - b.daysUntil)

    // Son tamamlananları sırala (en yeni önce)
    recentCompletions.sort(
      (a, b) =>
        new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime()
    )

    const completionPercentage =
      totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0

    return NextResponse.json({
      stats: {
        totalTopics,
        completedTopics,
        earlyTopics,
        lateCompletedTopics,
        inProgressTopics,
        plannedTopics,
        delayedTopics,
        pendingApprovalTopics,
        completionPercentage,
      },
      upcomingDeadlines: upcomingDeadlines.slice(0, 10), // En fazla 10 tane
      recentCompletions: recentCompletions.slice(0, 5), // En fazla 5 tane
    })
  } catch (error) {
    console.error("Error fetching teacher dashboard:", error)
    return NextResponse.json(
      { error: "Dashboard verileri getirilirken hata oluştu" },
      { status: 500 }
    )
  }
}

