import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - Genel ilerleme durumu raporu
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const academicYearId = searchParams.get("academicYearId")
    const subjectId = searchParams.get("subjectId")
    const grade = searchParams.get("grade")
    const section = searchParams.get("section")

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

    // İlerleme hesaplamaları
    const subjectStats: Record<
      string,
      {
        subjectName: string
        totalTopics: number
        completedTopics: number
        earlyTopics: number
        lateCompletedTopics: number
        inProgressTopics: number
        plannedTopics: number
        delayedTopics: number
        completionPercentage: number
      }
    > = {}

    topics.forEach((topic) => {
      const subjectId = topic.unit.subject.id
      const subjectName = topic.unit.subject.name

      if (!subjectStats[subjectId]) {
        subjectStats[subjectId] = {
          subjectName,
          totalTopics: 0,
          completedTopics: 0,
          earlyTopics: 0,
          lateCompletedTopics: 0,
          inProgressTopics: 0,
          plannedTopics: 0,
          delayedTopics: 0,
          completionPercentage: 0,
        }
      }

      subjectStats[subjectId].totalTopics++

      const progress = topic.progress?.[0]
      const now = new Date()
      now.setHours(0, 0, 0, 0)

      if (progress) {
        if (progress.status === "TAMAMLANDI") {
          subjectStats[subjectId].completedTopics++
          
          // Gecikme veya erken tamamlanma kontrolü
          if (topic.plannedEndDate && progress.actualEndDate) {
            const plannedDate = new Date(topic.plannedEndDate)
            plannedDate.setHours(0, 0, 0, 0)
            const actualDate = new Date(progress.actualEndDate)
            actualDate.setHours(0, 0, 0, 0)
            
            if (actualDate > plannedDate) {
              // Gecikmeli tamamlanan
              subjectStats[subjectId].lateCompletedTopics++
            } else if (actualDate < plannedDate) {
              // Erken tamamlanan
              subjectStats[subjectId].earlyTopics++
            }
          }
        } else if (progress.status === "DEVAM_EDIYOR") {
          subjectStats[subjectId].inProgressTopics++
        } else if (progress.status === "ERTELENDI") {
          subjectStats[subjectId].plannedTopics++
        } else {
          // PLANLANDI durumunda tarih kontrolü yap
          const startDate = topic.plannedStartDate ? new Date(topic.plannedStartDate) : null
          const endDate = topic.plannedEndDate ? new Date(topic.plannedEndDate) : null
          
          if (startDate) startDate.setHours(0, 0, 0, 0)
          if (endDate) endDate.setHours(0, 0, 0, 0)

          // Başlangıç tarihi geçmişte veya bugünse ve bitiş tarihi gelecekteyse → Devam Ediyor
          if (startDate && endDate && startDate <= now && endDate >= now) {
            subjectStats[subjectId].inProgressTopics++
          } else if (!startDate && endDate && endDate >= now) {
            // Sadece bitiş tarihi varsa ve bugün ile gelecek arasındaysa → Devam Ediyor
            subjectStats[subjectId].inProgressTopics++
          } else if (endDate && endDate < now) {
            // Bitiş tarihi geçmişteyse → Gecikmeli (tamamlanmamış)
            subjectStats[subjectId].delayedTopics++
            subjectStats[subjectId].plannedTopics++
          } else {
            subjectStats[subjectId].plannedTopics++
          }
        }
      } else {
        // Progress kaydı yoksa, tarihlere göre otomatik belirle
        const startDate = topic.plannedStartDate ? new Date(topic.plannedStartDate) : null
        const endDate = topic.plannedEndDate ? new Date(topic.plannedEndDate) : null
        
        if (startDate) startDate.setHours(0, 0, 0, 0)
        if (endDate) endDate.setHours(0, 0, 0, 0)

        // Başlangıç tarihi geçmişte veya bugünse ve bitiş tarihi gelecekteyse → Devam Ediyor
        if (startDate && endDate && startDate <= now && endDate >= now) {
          subjectStats[subjectId].inProgressTopics++
        } else if (!startDate && endDate && endDate >= now) {
          // Sadece bitiş tarihi varsa ve bugün ile gelecek arasındaysa → Devam Ediyor
          subjectStats[subjectId].inProgressTopics++
        } else if (endDate && endDate < now) {
          // Bitiş tarihi geçmişteyse → Gecikmeli (tamamlanmamış)
          subjectStats[subjectId].delayedTopics++
          subjectStats[subjectId].plannedTopics++
        } else {
          subjectStats[subjectId].plannedTopics++
        }
      }
    })

    // Yüzde hesaplama
    Object.keys(subjectStats).forEach((id) => {
      const stats = subjectStats[id]
      stats.completionPercentage =
        stats.totalTopics > 0
          ? Math.round((stats.completedTopics / stats.totalTopics) * 100)
          : 0
    })

    return NextResponse.json({
      subjects: Object.values(subjectStats),
      summary: {
        totalSubjects: Object.keys(subjectStats).length,
        totalTopics: topics.length,
        completedTopics: Object.values(subjectStats).reduce(
          (sum, s) => sum + s.completedTopics,
          0
        ),
        earlyTopics: Object.values(subjectStats).reduce(
          (sum, s) => sum + s.earlyTopics,
          0
        ),
        lateCompletedTopics: Object.values(subjectStats).reduce(
          (sum, s) => sum + s.lateCompletedTopics,
          0
        ),
        averageCompletion: Object.values(subjectStats).length > 0
          ? Math.round(
              Object.values(subjectStats).reduce(
                (sum, s) => sum + s.completionPercentage,
                0
              ) / Object.values(subjectStats).length
            )
          : 0,
      },
    })
  } catch (error) {
    console.error("Error generating progress report:", error)
    return NextResponse.json(
      { error: "Rapor oluşturulurken hata oluştu" },
      { status: 500 }
    )
  }
}

