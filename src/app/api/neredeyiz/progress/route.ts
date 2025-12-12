import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { ProgressStatus } from "@prisma/client"

// Bildirim helper fonksiyonları (server-side)
async function createNotificationServer(params: {
  type: string
  title: string
  message: string
  targetRole?: string | null
  targetUserId?: string | null
  priority?: string
  relatedSubjectId?: string | null
  relatedTopicId?: string | null
}) {
  try {
    await prisma.notification.create({
      data: {
        type: params.type as "ONAY_BEKLIYOR" | "TAMAMLANDI" | "GECIKMELI" | "YAKLASAN_DEADLINE" | "AKSAMA_OLUSTURULDU" | "OGRETMEN_ATANDI" | "UNITE_TAMAMLANDI" | "ERKEN_TAMAMLANDI" | "HAFTALIK_OZET" | "KRITIK_GECIKME",
        title: params.title,
        message: params.message,
        targetRole: params.targetRole ? (params.targetRole as "OGRETMEN" | "REHBERLIK" | "OGRENCI_ISLERI") : null,
        targetUserId: params.targetUserId || null,
        priority: (params.priority as "LOW" | "NORMAL" | "HIGH" | "CRITICAL") || "NORMAL",
        relatedSubjectId: params.relatedSubjectId || null,
        relatedTopicId: params.relatedTopicId || null,
      },
    })
  } catch (error) {
    console.error("Error creating notification:", error)
  }
}

// GET - Tüm ilerleme kayıtlarını listele
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const topicId = searchParams.get("topicId")
    const status = searchParams.get("status")
    const subjectId = searchParams.get("subjectId")
    const grade = searchParams.get("grade")
    const section = searchParams.get("section")

    const where: Record<string, unknown> = {}
    
    if (topicId) {
      where.topicId = topicId
    }
    if (status) {
      where.status = status as ProgressStatus
    }
    if (subjectId) {
      where.topic = {
        unit: {
          subjectId,
        },
      }
    } else if (grade || section) {
      // Sınıf veya şube filtresi varsa subject üzerinden filtrele
      const subjectWhere: Record<string, unknown> = {}
      if (grade) {
        subjectWhere.grade = parseInt(grade, 10)
      }
      if (section) {
        subjectWhere.section = section
      }
      where.topic = {
        unit: {
          subject: subjectWhere,
        },
      }
    }

    const progress = await prisma.progress.findMany({
      where,
      include: {
        topic: {
          include: {
            unit: {
              include: {
                subject: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Staff ID'lerini topla
    const staffIds = new Set<string>()
    progress.forEach((p) => {
      if (p.markedBy) staffIds.add(p.markedBy)
      if (p.approvedBy) staffIds.add(p.approvedBy)
      if (p.reportedBy) staffIds.add(p.reportedBy)
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

    // Progress kayıtlarına Staff bilgilerini ekle
    const progressWithStaff = progress.map((p) => ({
      ...p,
      markedByStaff: p.markedBy ? staffMap.get(p.markedBy) : null,
      approvedByStaff: p.approvedBy ? staffMap.get(p.approvedBy) : null,
      reportedByStaff: p.reportedBy ? staffMap.get(p.reportedBy) : null,
    }))

    // PENDING_APPROVAL durumundaki kayıtlar için topic bilgilerini de dahil et
    const progressWithTopics = await Promise.all(
      progressWithStaff.map(async (p) => {
        if (p.status === "PENDING_APPROVAL" && p.topicId) {
          const topic = await prisma.topic.findUnique({
            where: { id: p.topicId },
            include: {
              unit: {
                include: {
                  subject: true,
                },
              },
            },
          })
          return {
            ...p,
            topic: topic || p.topic,
          }
        }
        return p
      })
    )

    return NextResponse.json(progressWithTopics)
  } catch (error) {
    console.error("Error fetching progress:", error)
    return NextResponse.json(
      { error: "İlerleme kayıtları getirilirken hata oluştu" },
      { status: 500 }
    )
  }
}

// POST - Yeni ilerleme kaydı oluştur veya güncelle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      topicId,
      status,
      plannedDate,
      actualStartDate,
      actualEndDate,
      notes,
      reportedBy,
      reportedAt,
      markedBy,
    } = body

    if (!topicId || !status) {
      return NextResponse.json(
        { error: "Konu ID ve durum zorunludur" },
        { status: 400 }
      )
    }

    // Topic bilgisini çek (bildirim için)
    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
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
      },
    })

    if (!topic) {
      return NextResponse.json({ error: "Konu bulunamadı" }, { status: 404 })
    }

    // Mevcut progress kaydını kontrol et
    const existingProgress = await prisma.progress.findFirst({
      where: { topicId },
    })

    let progress
    if (existingProgress) {
      // Güncelle
      progress = await prisma.progress.update({
        where: { id: existingProgress.id },
        data: {
          status: status as ProgressStatus,
          plannedDate: plannedDate ? new Date(plannedDate) : null,
          actualStartDate: actualStartDate ? new Date(actualStartDate) : null,
          actualEndDate: actualEndDate ? new Date(actualEndDate) : null,
          notes: notes || null,
          reportedBy: reportedBy || null,
          reportedAt: reportedAt ? new Date(reportedAt) : (reportedBy ? new Date() : null),
          markedBy: markedBy || null,
          markedAt: markedBy ? new Date() : null,
        },
      })
    } else {
      // Yeni oluştur
      progress = await prisma.progress.create({
        data: {
          topicId,
          status: status as ProgressStatus,
          plannedDate: plannedDate ? new Date(plannedDate) : null,
          actualStartDate: actualStartDate ? new Date(actualStartDate) : null,
          actualEndDate: actualEndDate ? new Date(actualEndDate) : null,
          notes: notes || null,
          reportedBy: reportedBy || null,
          reportedAt: reportedAt ? new Date(reportedAt) : (reportedBy ? new Date() : null),
          markedBy: markedBy || null,
          markedAt: markedBy ? new Date() : null,
        },
      })
    }

    // BİLDİRİM OLUŞTUR
    const subject = topic.unit.subject
    const teacherStaff = markedBy ? await prisma.staff.findUnique({ where: { id: markedBy } }) : null

    // Onay bekliyor bildirimi (Rehberlik için)
    if (status === "PENDING_APPROVAL") {
      const teacherName = teacherStaff
        ? `${teacherStaff.firstName} ${teacherStaff.lastName}`
        : "Bir öğretmen"

      await createNotificationServer({
        type: "ONAY_BEKLIYOR",
        title: "Onay Bekleyen Konu",
        message: `${teacherName}, ${subject.grade}${subject.section ? `/${subject.section}` : ""}. sınıf ${subject.name} - ${topic.name} konusunu tamamlandı olarak bildirdi.`,
        targetRole: "REHBERLIK",
        priority: "HIGH",
        relatedTopicId: topicId,
        relatedSubjectId: subject.id,
      })
    }

    return NextResponse.json(progress, { status: existingProgress ? 200 : 201 })
  } catch (error) {
    console.error("Error saving progress:", error)
    return NextResponse.json(
      { error: "İlerleme kaydı oluşturulurken hata oluştu" },
      { status: 500 }
    )
  }
}

