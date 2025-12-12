import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Bildirim helper
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

// POST - Progress kaydını onayla
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const body = await request.json()
    const { approvedBy } = body

    if (!approvedBy) {
      return NextResponse.json(
        { error: "Onaylayan kullanıcı ID'si zorunludur" },
        { status: 400 }
      )
    }

    // Progress kaydını bul
    const progress = await prisma.progress.findUnique({
      where: { id: params.id },
    })

    if (!progress) {
      return NextResponse.json(
        { error: "İlerleme kaydı bulunamadı" },
        { status: 404 }
      )
    }

    if (progress.status !== "PENDING_APPROVAL") {
      return NextResponse.json(
        { error: "Bu kayıt onay bekliyor durumunda değil" },
        { status: 400 }
      )
    }

    // Onayla
    const updatedProgress = await prisma.progress.update({
      where: { id: params.id },
      data: {
        status: "TAMAMLANDI",
        approvedBy,
        approvedAt: new Date(),
      },
      include: {
        topic: {
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
        },
      },
    })

    // BİLDİRİM: Öğretmene konu onaylandı
    const subject = updatedProgress.topic.unit.subject
    const teachers = subject.assignments.map((a) => a.staff)

    for (const teacher of teachers) {
      await createNotificationServer({
        type: "TAMAMLANDI",
        title: "Konu Onaylandı ✅",
        message: `${subject.grade}${subject.section ? `/${subject.section}` : ""}. sınıf ${subject.name} - ${updatedProgress.topic.name} konusu onaylandı. Tebrikler!`,
        targetRole: "OGRETMEN",
        targetUserId: teacher.id,
        priority: "NORMAL",
        relatedTopicId: updatedProgress.topicId,
        relatedSubjectId: subject.id,
      })
    }

    return NextResponse.json(updatedProgress)
  } catch (error) {
    console.error("Error approving progress:", error)
    return NextResponse.json(
      { error: "Onay işlemi sırasında hata oluştu" },
      { status: 500 }
    )
  }
}

