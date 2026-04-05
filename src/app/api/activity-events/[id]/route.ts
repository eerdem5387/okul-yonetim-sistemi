import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkActivityAccess } from "@/lib/access-control"
import { Prisma } from "@prisma/client"
import {
  parseOptionalInt,
  parseParticipantLanguageLevel,
  parseParticipantScore,
  sanitizeEvidenceUrls,
  sanitizeMetadata,
  validateParticipantsForCertificate,
} from "@/lib/activity-event-mutation-helpers"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { hasAccess } = await checkActivityAccess(request)
  if (!hasAccess) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 })
  }

  try {
    const { id } = await context.params
    const event = await prisma.activityEvent.findUnique({
      where: { id },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true, department: true } },
        participants: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                grade: true,
                tcNumber: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    })

    if (!event) {
      return NextResponse.json({ error: "Faaliyet bulunamadı" }, { status: 404 })
    }

    return NextResponse.json(event)
  } catch (error) {
    console.error("GET /api/activity-events/[id] error:", error)
    return NextResponse.json({ error: "Faaliyet yüklenirken hata oluştu" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { hasAccess } = await checkActivityAccess(request)
  if (!hasAccess) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 })
  }

  try {
    const { id } = await context.params
    const body = await request.json()

    const existing = await prisma.activityEvent.findUnique({
      where: { id },
      include: { participants: { select: { id: true, verificationStatus: true, studentId: true } } },
    })
    if (!existing) {
      return NextResponse.json({ error: "Faaliyet bulunamadı" }, { status: 404 })
    }

    const {
      title,
      description,
      outcome,
      location,
      organizerName,
      durationHours,
      durationDays,
      durationMonths,
      durationYears,
      evidenceUrls,
      teacherId,
      startDate,
      endDate,
      metadata,
      participants,
    } = body

    const hasParticipantPayload = Array.isArray(participants)
    if (hasParticipantPayload) {
      const notEditable = existing.participants.some((p) => p.verificationStatus !== "IMZA_SURECINDE")
      if (notEditable) {
        return NextResponse.json(
          {
            error:
              "Katılımcı listesi veya katılımcı bilgileri, onay veya imza sürecindeki kayıtlar için değiştirilemez. Yalnızca faaliyet detaylarını güncellemek için istekte «participants» alanını göndermeyin.",
            code: "PARTICIPANTS_LOCKED",
          },
          { status: 409 }
        )
      }
      if (participants.length === 0) {
        return NextResponse.json({ error: "En az bir katılımcı olmalıdır" }, { status: 400 })
      }
      const certType = existing.certificateType
      const v = validateParticipantsForCertificate(participants, certType)
      if (!v.ok) {
        return NextResponse.json({ error: v.error }, { status: 400 })
      }
      const uniqueStudentIds = [...new Set(participants.map((p: { studentId: string }) => String(p.studentId).trim()))]
      const existingStudents = await prisma.student.findMany({
        where: { id: { in: uniqueStudentIds } },
        select: { id: true },
      })
      if (existingStudents.length !== uniqueStudentIds.length) {
        return NextResponse.json(
          { error: "Bir veya daha fazla öğrenci veritabanında bulunamadı." },
          { status: 400 }
        )
      }
    }

    let start: Date | undefined
    let end: Date | undefined
    if (startDate !== undefined) {
      start = new Date(startDate)
      if (Number.isNaN(start.getTime())) {
        return NextResponse.json({ error: "Başlangıç tarihi geçersiz" }, { status: 400 })
      }
    }
    if (endDate !== undefined) {
      end = new Date(endDate)
      if (Number.isNaN(end.getTime())) {
        return NextResponse.json({ error: "Bitiş tarihi geçersiz" }, { status: 400 })
      }
    }
    const effectiveStart = start ?? existing.startDate
    const effectiveEnd = end ?? existing.endDate
    if (effectiveStart >= effectiveEnd) {
      return NextResponse.json({ error: "Bitiş tarihi başlangıçtan sonra olmalıdır" }, { status: 400 })
    }

    if (teacherId !== undefined && teacherId) {
      const teacherRow = await prisma.staff.findUnique({
        where: { id: String(teacherId) },
        select: { id: true },
      })
      if (!teacherRow) {
        return NextResponse.json({ error: "Seçilen sorumlu öğretmen bulunamadı." }, { status: 400 })
      }
    }

    const metadataForDb: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue | undefined =
      metadata === undefined
        ? undefined
        : metadata == null
          ? Prisma.DbNull
          : (() => {
              const s = sanitizeMetadata(metadata)
              return s === undefined ? Prisma.DbNull : s
            })()

    const evidenceList =
      evidenceUrls !== undefined ? sanitizeEvidenceUrls(evidenceUrls) : undefined

    const updated = await prisma.$transaction(async (tx) => {
      if (hasParticipantPayload) {
        await tx.activityParticipant.deleteMany({ where: { activityId: id } })
      }

      const row = await tx.activityEvent.update({
        where: { id },
        data: {
          ...(title !== undefined && { title: String(title).trim() }),
          ...(description !== undefined && { description: description ? String(description).trim() : null }),
          ...(outcome !== undefined && { outcome: outcome ? String(outcome).trim() : null }),
          ...(location !== undefined && { location: location ? String(location).trim() : null }),
          ...(organizerName !== undefined && { organizerName: String(organizerName || "").trim() || existing.organizerName }),
          ...(durationHours !== undefined && { durationHours: parseOptionalInt(durationHours) }),
          ...(durationDays !== undefined && { durationDays: parseOptionalInt(durationDays) }),
          ...(durationMonths !== undefined && { durationMonths: parseOptionalInt(durationMonths) }),
          ...(durationYears !== undefined && { durationYears: parseOptionalInt(durationYears) }),
          ...(evidenceList !== undefined && { evidenceUrls: evidenceList }),
          ...(teacherId !== undefined && { teacherId: String(teacherId) }),
          ...(start && { startDate: start }),
          ...(end && { endDate: end }),
          ...(metadataForDb !== undefined && { metadata: metadataForDb }),
        },
      })

      if (hasParticipantPayload) {
        await tx.activityParticipant.createMany({
          data: (participants as Array<Record<string, unknown>>).map((p) => ({
            activityId: id,
            studentId: String(p.studentId),
            score: parseParticipantScore(p.score),
            languageLevel: parseParticipantLanguageLevel(p.languageLevel),
            participationPhotoUrl: (p.participationPhotoUrl as string) || null,
            extraDocumentUrl: (p.extraDocumentUrl as string) || null,
            artworkDescription: p.artworkDescription != null ? String(p.artworkDescription).trim() || null : null,
            tournamentPlacement: p.tournamentPlacement != null ? String(p.tournamentPlacement).trim() || null : null,
            projectRole: p.projectRole != null ? String(p.projectRole).trim() || null : null,
          })),
        })
      }

      return row
    })

    const full = await prisma.activityEvent.findUnique({
      where: { id: updated.id },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        participants: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true, grade: true, tcNumber: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    })

    return NextResponse.json(full)
  } catch (error) {
    console.error("PUT /api/activity-events/[id] error:", error)
    return NextResponse.json({ error: "Faaliyet güncellenirken hata oluştu" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { hasAccess } = await checkActivityAccess(request)
  if (!hasAccess) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 })
  }

  try {
    const { id } = await context.params

    const existing = await prisma.activityEvent.findUnique({
      where: { id },
      include: { participants: { select: { verificationStatus: true } } },
    })

    if (!existing) {
      return NextResponse.json({ error: "Faaliyet bulunamadı" }, { status: 404 })
    }

    const hasApproved = existing.participants.some(
      (p) => p.verificationStatus === "ONAYLANDI"
    )
    if (hasApproved) {
      return NextResponse.json(
        { error: "Onaylanmış katılımcısı olan faaliyet silinemez" },
        { status: 409 }
      )
    }

    await prisma.activityEvent.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/activity-events/[id] error:", error)
    return NextResponse.json({ error: "Faaliyet silinirken hata oluştu" }, { status: 500 })
  }
}
