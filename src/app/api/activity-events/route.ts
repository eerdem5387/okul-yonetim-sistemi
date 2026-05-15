import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkActivityAccess } from "@/lib/access-control"
import { ActivityMainType, ActivityVerificationStatus, LanguageLevel, Prisma } from "@prisma/client"

/** Prisma enum ile aynı; runtime'da Object.values tutarsızlığına karşı sabit liste */
const LANGUAGE_LEVEL_VALUES = new Set<string>(["A1", "A2", "B1", "B2", "C1", "C2"])

const ALLOWED_ACTIVITY_MAIN_TYPES = new Set<string>([
  "EGITIM",
  "GEZI",
  "GORSEL_SANATLAR",
  "MUZIK",
  "GASTRONOMI",
  "PROJE",
  "SPOR",
  "TURNUVA",
])

function sanitizeMetadata(raw: unknown): Prisma.InputJsonValue | undefined {
  if (raw === null || raw === undefined) return undefined
  try {
    return JSON.parse(JSON.stringify(raw)) as Prisma.InputJsonValue
  } catch {
    return undefined
  }
}

function sanitizeEvidenceUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((u): u is string => typeof u === "string" && u.length > 0)
}

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
    const studentId = searchParams.get("studentId") || ""
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
    if (studentId) {
      andConds.push({
        participants: {
          some: { studentId },
        },
      })
    }
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
      participants, // Array<{ studentId, score?, languageLevel?, extraDocumentUrl? }>
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

    const mainTypeStr = String(mainType).trim()
    if (!ALLOWED_ACTIVITY_MAIN_TYPES.has(mainTypeStr)) {
      return NextResponse.json(
        { error: "Geçersiz faaliyet ana türü", detail: mainTypeStr },
        { status: 400 }
      )
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Başlangıç veya bitiş tarihi geçersiz veya okunamıyor" },
        { status: 400 }
      )
    }

    const teacherRow = await prisma.staff.findUnique({
      where: { id: String(teacherId) },
      select: { id: true },
    })
    if (!teacherRow) {
      return NextResponse.json(
        { error: "Seçilen sorumlu öğretmen veritabanında yok veya silinmiş." },
        { status: 400 }
      )
    }

    const participantStudentIds = participants.map((p: { studentId: string }) => String(p.studentId || "").trim())
    if (participantStudentIds.some((id) => !id)) {
      return NextResponse.json({ error: "Katılımcı öğrenci kimliği eksik" }, { status: 400 })
    }

    const uniqueStudentIds = [...new Set(participantStudentIds)]
    if (uniqueStudentIds.length !== participantStudentIds.length) {
      return NextResponse.json(
        { error: "Aynı öğrenci listede birden fazla kez eklenemez" },
        { status: 400 }
      )
    }
    const existingStudents = await prisma.student.findMany({
      where: { id: { in: uniqueStudentIds } },
      select: { id: true },
    })
    if (existingStudents.length !== uniqueStudentIds.length) {
      return NextResponse.json(
        {
          error: "Bir veya daha fazla öğrenci veritabanında bulunamadı.",
          detail: "Listeden kaldırılmış veya hatalı öğrenci seçimi olabilir.",
        },
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

    const evidenceList = sanitizeEvidenceUrls(evidenceUrls)
    const metadataForDb: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue =
      metadata == null
        ? Prisma.DbNull
        : (() => {
            const s = sanitizeMetadata(metadata)
            return s === undefined ? Prisma.DbNull : s
          })()

    const event = await prisma.activityEvent.create({
      data: {
        mainType: mainTypeStr as ActivityMainType,
        subtype: subtype ? String(subtype).trim() || null : null,
        certificateType: String(certificateType).trim(),
        title: title.trim(),
        description: description?.trim() || null,
        outcome: outcome?.trim() || null,
        startDate: start,
        endDate: end,
        location: location?.trim() || null,
        organizerName: organizerName.trim(),
        durationHours: parseOptionalInt(durationHours),
        durationDays: parseOptionalInt(durationDays),
        durationMonths: parseOptionalInt(durationMonths),
        durationYears: parseOptionalInt(durationYears),
        evidenceUrls: evidenceList,
        metadata: metadataForDb,
        teacherId: String(teacherId),
        createdBy: staffId?.trim() || "unknown",
        participants: {
          create: participants.map((p: {
            studentId: string
            score?: number
            languageLevel?: string
            extraDocumentUrl?: string
            artworkDescription?: string | null
            participationPhotoUrl?: string | null
            tournamentPlacement?: string | null
            projectRole?: string | null
          }) => ({
            studentId: p.studentId,
            score: parseParticipantScore(p.score),
            languageLevel: parseParticipantLanguageLevel(p.languageLevel),
            extraDocumentUrl: p.extraDocumentUrl || null,
            artworkDescription: p.artworkDescription?.trim() || null,
            participationPhotoUrl: p.participationPhotoUrl?.trim() || null,
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
    if (error instanceof Prisma.PrismaClientValidationError) {
      const msg = error.message.length > 600 ? `${error.message.slice(0, 600)}…` : error.message
      return NextResponse.json(
        {
          error: "Kayıt verileri veritabanı şemasıyla uyuşmuyor (tür, tarih veya ilişkili kayıtları kontrol edin).",
          detail: msg,
        },
        { status: 400 }
      )
    }
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
      if (error.code === "P2021" || error.code === "P2022") {
        return NextResponse.json(
          {
            error: "Veritabanı şeması güncel değil. Sunucuda `npx prisma migrate deploy` çalıştırılmalı.",
            detail: error.code,
          },
          { status: 503 }
        )
      }
    }
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      {
        error: "Faaliyet oluşturulurken hata oluştu",
        detail: message.slice(0, 400),
      },
      { status: 500 }
    )
  }
}
