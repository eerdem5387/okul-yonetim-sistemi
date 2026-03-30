import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkActivityAccess } from "@/lib/access-control"
import { ActivityMainType, ActivityVerificationStatus, LanguageLevel, Prisma } from "@prisma/client"

const LANGUAGE_LEVEL_VALUES = new Set<string>(Object.values(LanguageLevel))

export async function GET(request: NextRequest) {
  const { hasAccess } = await checkActivityAccess(request)
  if (!hasAccess) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "20"))
    const mainType = searchParams.get("mainType") || ""
    const subtype = searchParams.get("subtype") || ""
    const teacherId = searchParams.get("teacherId") || ""
    const search = searchParams.get("search") || ""
    const startDate = searchParams.get("startDate") || ""
    const endDate = searchParams.get("endDate") || ""
    const verificationStatus = searchParams.get("verificationStatus") || ""

    const where: Record<string, unknown> = {}
    const andConds: Record<string, unknown>[] = []

    if (mainType && mainType !== "ALL") {
      andConds.push({ mainType: mainType as ActivityMainType })
    }
    if (subtype) andConds.push({ subtype })
    if (teacherId) andConds.push({ teacherId })
    if (startDate) andConds.push({ startDate: { gte: new Date(startDate) } })
    if (endDate) andConds.push({ endDate: { lte: new Date(endDate) } })
    if (search) {
      andConds.push({
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { organizerName: { contains: search, mode: "insensitive" } },
        ],
      })
    }
    if (
      verificationStatus === "IMZA_SURECINDE" ||
      verificationStatus === "ONAY_BEKLIYOR" ||
      verificationStatus === "ONAYLANDI"
    ) {
      andConds.push({
        participants: {
          some: { verificationStatus: verificationStatus as ActivityVerificationStatus },
        },
      })
    }

    if (andConds.length > 0) where.AND = andConds

    const skip = (page - 1) * limit

    const [events, total] = await Promise.all([
      prisma.activityEvent.findMany({
        where,
        include: {
          teacher: { select: { id: true, firstName: true, lastName: true } },
          participants: {
            include: {
              student: { select: { id: true, firstName: true, lastName: true, grade: true, tcNumber: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.activityEvent.count({ where }),
    ])

    return NextResponse.json({
      events,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error("GET /api/activity-events error:", error)
    return NextResponse.json({ error: "Faaliyetler yüklenirken hata oluştu" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { hasAccess, staffId } = await checkActivityAccess(request)
  if (!hasAccess) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const {
      mainType,
      subtype,
      certificateType,
      title,
      description,
      outcome,
      startDate,
      endDate,
      location,
      organizerName,
      durationHours,
      durationDays,
      durationMonths,
      durationYears,
      evidenceUrls,
      teacherId,
      metadata,
      participants, // Array<{ studentId, score?, languageLevel?, participationPhotoUrl?, extraDocumentUrl? }>
    } = body

    // Zorunlu alan kontrolleri
    if (!mainType || !title?.trim()) {
      return NextResponse.json({ error: "Ana tür ve başlık zorunludur" }, { status: 400 })
    }
    if (!startDate || !endDate) {
      return NextResponse.json({ error: "Başlangıç ve bitiş tarihi zorunludur" }, { status: 400 })
    }
    if (!organizerName?.trim()) {
      return NextResponse.json({ error: "Organizatör alanı zorunludur" }, { status: 400 })
    }
    if (!teacherId) {
      return NextResponse.json({ error: "Sorumlu öğretmen zorunludur" }, { status: 400 })
    }
    if (!certificateType) {
      return NextResponse.json({ error: "Sertifika tipi zorunludur" }, { status: 400 })
    }
    if (!Array.isArray(participants) || participants.length === 0) {
      return NextResponse.json({ error: "En az bir katılımcı eklenmelidir" }, { status: 400 })
    }

    const photoRequired = certificateType !== "PROJE_KATILIM"
    if (photoRequired) {
      const missingPhoto = participants.find(
        (p: { studentId: string; participationPhotoUrl?: string }) => !p.participationPhotoUrl?.trim()
      )
      if (missingPhoto) {
        return NextResponse.json({ error: "Her katılımcı için katılım fotoğrafı zorunludur" }, { status: 400 })
      }
    }

    const studentIds = participants.map((p: { studentId: string }) => p.studentId)
    if (new Set(studentIds).size !== studentIds.length) {
      return NextResponse.json(
        { error: "Aynı öğrenci listede birden fazla kez eklenemez" },
        { status: 400 }
      )
    }

    function parseParticipantScore(value: unknown): number | null {
      if (value === null || value === undefined || value === "") return null
      const n = parseInt(String(value), 10)
      return Number.isFinite(n) ? n : null
    }

    function parseParticipantLanguageLevel(value: unknown): LanguageLevel | null {
      if (value === null || value === undefined || value === "") return null
      const s = String(value).trim()
      if (!LANGUAGE_LEVEL_VALUES.has(s)) return null
      return s as LanguageLevel
    }

    function parseOptionalInt(value: unknown): number | null {
      if (value === null || value === undefined || value === "") return null
      const n = parseInt(String(value), 10)
      return Number.isFinite(n) ? n : null
    }

    const event = await prisma.activityEvent.create({
      data: {
        mainType: mainType as ActivityMainType,
        subtype: subtype || null,
        certificateType,
        title: title.trim(),
        description: description?.trim() || null,
        outcome: outcome?.trim() || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        location: location?.trim() || null,
        organizerName: organizerName.trim(),
        durationHours: parseOptionalInt(durationHours),
        durationDays: parseOptionalInt(durationDays),
        durationMonths: parseOptionalInt(durationMonths),
        durationYears: parseOptionalInt(durationYears),
        evidenceUrls: Array.isArray(evidenceUrls) ? evidenceUrls : [],
        metadata: metadata ?? null,
        teacherId,
        createdBy: staffId || "unknown",
        participants: {
          create: participants.map((p: {
            studentId: string
            score?: number
            languageLevel?: string
            participationPhotoUrl?: string
            extraDocumentUrl?: string
            artworkDescription?: string | null
            tournamentPlacement?: string | null
            projectRole?: string | null
          }) => ({
            studentId: p.studentId,
            score: parseParticipantScore(p.score),
            languageLevel: parseParticipantLanguageLevel(p.languageLevel),
            participationPhotoUrl: p.participationPhotoUrl || null,
            extraDocumentUrl: p.extraDocumentUrl || null,
            artworkDescription: p.artworkDescription?.trim() || null,
            tournamentPlacement: p.tournamentPlacement?.trim() || null,
            projectRole: p.projectRole?.trim() || null,
          })),
        },
      },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        participants: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true, grade: true, tcNumber: true } },
          },
        },
      },
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error("POST /api/activity-events error:", error)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "Bu öğrenci bu faaliyette zaten kayıtlı veya listede mükerrer kayıt var." },
          { status: 400 }
        )
      }
      if (error.code === "P2003") {
        return NextResponse.json(
          { error: "Seçilen öğretmen veya öğrenci veritabanında bulunamadı." },
          { status: 400 }
        )
      }
    }
    return NextResponse.json({ error: "Faaliyet oluşturulurken hata oluştu" }, { status: 500 })
  }
}
