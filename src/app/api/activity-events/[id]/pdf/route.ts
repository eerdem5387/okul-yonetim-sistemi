import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkActivityAccess } from "@/lib/access-control"
import { generatePDF } from "@/lib/pdf-generator"
import { buildLanguageCertificateHTML, LanguageCertData } from "@/lib/certificates/dil-egitimi-katilim"
import { buildFenCertificateHTML, FenCertData } from "@/lib/certificates/ingilizce-fen-sertifika"
import { buildMatematikCertificateHTML, MatematikCertData } from "@/lib/certificates/ingilizce-matematik-sertifika"
import { buildRobotikCertificateHTML, RobotikCertData } from "@/lib/certificates/robotik-sertifika"
import { buildYapayZekaCertificateHTML, YapayZekaCertData } from "@/lib/certificates/yapay-zeka-sertifika"
import { buildGeziCertificateHTML, GeziCertData } from "@/lib/certificates/gezi-katilim"
import {
  buildGorselSanatlarEgitimCertificateHTML,
  GorselSanatlarEgitimCertData,
} from "@/lib/certificates/gorsel-sanatlar-egitim"
import {
  buildGorselSanatlarEtkinlikCertificateHTML,
  GorselSanatlarEtkinlikCertData,
} from "@/lib/certificates/gorsel-sanatlar-etkinlik"
import { buildMuzikEgitimCertificateHTML, MuzikEgitimCertData } from "@/lib/certificates/muzik-egitim"
import { buildMuzikEserIcraCertificateHTML, MuzikEserIcraCertData } from "@/lib/certificates/muzik-eser-icra"
import {
  buildGastronomiEgitimCertificateHTML,
  type GastronomiEgitimCertData,
} from "@/lib/certificates/gastronomi-egitim"
import {
  buildGastronomiEtkinlikCertificateHTML,
  type GastronomiEtkinlikCertData,
} from "@/lib/certificates/gastronomi-etkinlik"
import {
  buildBasketbolEgitimCertificateHTML,
  type BasketbolEgitimCertData,
} from "@/lib/certificates/basketbol-egitim"
import {
  buildBedenEgitimCertificateHTML,
  type BedenEgitimCertData,
} from "@/lib/certificates/beden-egitim"
import {
  buildHentbolEgitimCertificateHTML,
  type HentbolEgitimCertData,
} from "@/lib/certificates/hentbol-egitim"
import {
  buildVoleybolEgitimCertificateHTML,
  type VoleybolEgitimCertData,
} from "@/lib/certificates/voleybol-egitim"
import {
  buildTurnuvaKatilimCertificateHTML,
  type TurnuvaKatilimCertData,
} from "@/lib/certificates/turnuva-katilim"
import {
  buildTurnuvaBasariCertificateHTML,
  type TurnuvaBasariCertData,
} from "@/lib/certificates/turnuva-basari"
import {
  buildProjeKatilimCertificateHTML,
  type ProjeKatilimCertData,
} from "@/lib/certificates/proje-katilim"
import { applyGlobalCertificateLayout } from "@/lib/certificates/global-certificate-layout"

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
        teacher: { select: { firstName: true, lastName: true } },
        participants: {
          include: {
            student: {
              select: {
                firstName: true,
                lastName: true,
                tcNumber: true,
                grade: true,
              },
            },
          },
        },
      },
    })

    if (!event) {
      return NextResponse.json({ error: "Faaliyet bulunamadı" }, { status: 404 })
    }

    const pdfKind = request.nextUrl.searchParams.get("kind")
    const participantId = request.nextUrl.searchParams.get("participantId")
    const selectedParticipants = participantId
      ? event.participants.filter((p) => p.id === participantId)
      : event.participants

    if (participantId && selectedParticipants.length === 0) {
      return NextResponse.json({ error: "Katılımcı bulunamadı" }, { status: 404 })
    }

    let html = ""

    if (event.certificateType === "TURNUVA_KATILIM") {
      const meta = (event.metadata as Record<string, unknown> | null) ?? {}
      const totalRaw = meta.tournamentTotalParticipants
      const totalParticipants =
        typeof totalRaw === "number"
          ? totalRaw
          : parseInt(String(totalRaw ?? ""), 10) || 0
      const teacherName = `${event.teacher.firstName} ${event.teacher.lastName}`

      if (pdfKind === "achievement") {
        const placed = selectedParticipants.filter((p) => (p.tournamentPlacement ?? "").trim())
        if (totalParticipants < 1) {
          return NextResponse.json(
            { error: "Toplam yarışmacı sayısı kayıtta yok veya geçersiz" },
            { status: 400 }
          )
        }
        if (!placed.length) {
          return NextResponse.json({ error: "Derece girilmiş katılımcı yok" }, { status: 400 })
        }
        const certData: TurnuvaBasariCertData = {
          tournamentDescription: event.description || event.title,
          totalParticipants,
          startDate: event.startDate.toISOString(),
          endDate: event.endDate.toISOString(),
          teacherName,
          createdAt: event.createdAt.toISOString(),
          participants: placed.map((p) => ({
            firstName: p.student.firstName,
            lastName: p.student.lastName,
            tcNumber: p.student.tcNumber,
            grade: p.student.grade,
            placement: (p.tournamentPlacement ?? "").trim(),
          })),
        }
        html = buildTurnuvaBasariCertificateHTML(certData)
      } else {
        const certData: TurnuvaKatilimCertData = {
          tournamentDescription: event.description || event.title,
          startDate: event.startDate.toISOString(),
          endDate: event.endDate.toISOString(),
          teacherName,
          createdAt: event.createdAt.toISOString(),
          participants: selectedParticipants.map((p) => ({
            firstName: p.student.firstName,
            lastName: p.student.lastName,
            tcNumber: p.student.tcNumber,
            grade: p.student.grade,
          })),
        }
        html = buildTurnuvaKatilimCertificateHTML(certData)
      }
    } else if (event.certificateType === "DIL_EGITIMI_KATILIM") {
      const certData: LanguageCertData = {
        title: event.title,
        educationDescription: event.description || event.title,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        teacherName: `${event.teacher.firstName} ${event.teacher.lastName}`,
        organizerName: event.organizerName,
        createdAt: event.createdAt.toISOString(),
        participants: selectedParticipants.map((p) => ({
          firstName: p.student.firstName,
          lastName: p.student.lastName,
          tcNumber: p.student.tcNumber,
          grade: p.student.grade,
          score: p.score ?? 0,
          languageLevel: p.languageLevel ?? "A1",
        })),
      }
      html = buildLanguageCertificateHTML(certData)
    } else if (event.certificateType === "INGILIZCE_FEN_SERTIFIKA") {
      const certData: FenCertData = {
        title: event.title,
        educationDescription: event.description || event.title,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        teacherName: `${event.teacher.firstName} ${event.teacher.lastName}`,
        organizerName: event.organizerName,
        createdAt: event.createdAt.toISOString(),
        participants: selectedParticipants.map((p) => ({
          firstName: p.student.firstName,
          lastName: p.student.lastName,
          tcNumber: p.student.tcNumber,
          grade: p.student.grade,
          score: p.score ?? 0,
        })),
      }
      html = buildFenCertificateHTML(certData)
    } else if (event.certificateType === "INGILIZCE_MATEMATIK_SERTIFIKA") {
      const certData: MatematikCertData = {
        title: event.title,
        educationDescription: event.description || event.title,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        teacherName: `${event.teacher.firstName} ${event.teacher.lastName}`,
        organizerName: event.organizerName,
        createdAt: event.createdAt.toISOString(),
        participants: selectedParticipants.map((p) => ({
          firstName: p.student.firstName,
          lastName: p.student.lastName,
          tcNumber: p.student.tcNumber,
          grade: p.student.grade,
          score: p.score ?? 0,
        })),
      }
      html = buildMatematikCertificateHTML(certData)
    } else if (event.certificateType === "ROBOTIK_SERTIFIKA") {
      const certData: RobotikCertData = {
        title: event.title,
        educationDescription: event.description || event.title,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        teacherName: `${event.teacher.firstName} ${event.teacher.lastName}`,
        organizerName: event.organizerName,
        createdAt: event.createdAt.toISOString(),
        participants: selectedParticipants.map((p) => ({
          firstName: p.student.firstName,
          lastName: p.student.lastName,
          tcNumber: p.student.tcNumber,
          grade: p.student.grade,
          score: p.score ?? 0,
        })),
      }
      html = buildRobotikCertificateHTML(certData)
    } else if (event.certificateType === "YAPAY_ZEKA_SERTIFIKA") {
      const certData: YapayZekaCertData = {
        title: event.title,
        educationDescription: event.description || event.title,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        teacherName: `${event.teacher.firstName} ${event.teacher.lastName}`,
        organizerName: event.organizerName,
        createdAt: event.createdAt.toISOString(),
        participants: selectedParticipants.map((p) => ({
          firstName: p.student.firstName,
          lastName: p.student.lastName,
          tcNumber: p.student.tcNumber,
          grade: p.student.grade,
          score: p.score ?? 0,
        })),
      }
      html = buildYapayZekaCertificateHTML(certData)
    } else if (event.certificateType === "GEZI_KATILIM") {
      const certData: GeziCertData = {
        title: event.title,
        description: event.description || event.title,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        teacherName: `${event.teacher.firstName} ${event.teacher.lastName}`,
        createdAt: event.createdAt.toISOString(),
        participants: selectedParticipants.map((p) => ({
          firstName: p.student.firstName,
          lastName: p.student.lastName,
          tcNumber: p.student.tcNumber,
          grade: p.student.grade,
        })),
      }
      html = buildGeziCertificateHTML(certData)
    } else if (event.certificateType === "GORSEL_SANATLAR_EGITIM") {
      const meta = (event.metadata as Record<string, unknown> | null) ?? {}
      const certData: GorselSanatlarEgitimCertData = {
        title: event.title,
        description: event.description || event.title,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        teacherName: `${event.teacher.firstName} ${event.teacher.lastName}`,
        organizerName: event.organizerName,
        createdAt: event.createdAt.toISOString(),
        numberOfArtworks: typeof meta.numberOfArtworks === "number" ? meta.numberOfArtworks : 0,
        vicePrincipalName: typeof meta.vicePrincipalName === "string" ? meta.vicePrincipalName : "",
        participants: selectedParticipants.map((p) => ({
          firstName: p.student.firstName,
          lastName: p.student.lastName,
          tcNumber: p.student.tcNumber,
          grade: p.student.grade,
        })),
      }
      html = buildGorselSanatlarEgitimCertificateHTML(certData)
    } else if (event.certificateType === "GORSEL_SANATLAR_ETKINLIK") {
      const certData: GorselSanatlarEtkinlikCertData = {
        title: event.title,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        teacherName: `${event.teacher.firstName} ${event.teacher.lastName}`,
        createdAt: event.createdAt.toISOString(),
        participants: selectedParticipants.map((p) => ({
          firstName: p.student.firstName,
          lastName: p.student.lastName,
          tcNumber: p.student.tcNumber,
          grade: p.student.grade,
          artworkDescription: p.artworkDescription ?? "",
          participationPhotoUrl: p.participationPhotoUrl ?? "",
        })),
      }
      html = buildGorselSanatlarEtkinlikCertificateHTML(certData)
    } else if (event.certificateType === "MUZIK_EGITIM") {
      const certData: MuzikEgitimCertData = {
        title: event.title,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        teacherName: `${event.teacher.firstName} ${event.teacher.lastName}`,
        organizerName: event.organizerName,
        createdAt: event.createdAt.toISOString(),
        participants: selectedParticipants.map((p) => ({
          firstName: p.student.firstName,
          lastName: p.student.lastName,
          tcNumber: p.student.tcNumber,
          grade: p.student.grade,
        })),
      }
      html = buildMuzikEgitimCertificateHTML(certData)
    } else if (event.certificateType === "GASTRONOMI_EGITIM") {
      const certData: GastronomiEgitimCertData = {
        title: event.title,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        teacherName: `${event.teacher.firstName} ${event.teacher.lastName}`,
        organizerName: event.organizerName,
        createdAt: event.createdAt.toISOString(),
        participants: selectedParticipants.map((p) => ({
          firstName: p.student.firstName,
          lastName: p.student.lastName,
          tcNumber: p.student.tcNumber,
          grade: p.student.grade,
        })),
      }
      html = buildGastronomiEgitimCertificateHTML(certData)
    } else if (event.certificateType === "GASTRONOMI_ETKINLIK") {
      const certData: GastronomiEtkinlikCertData = {
        title: event.title,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        teacherName: `${event.teacher.firstName} ${event.teacher.lastName}`,
        createdAt: event.createdAt.toISOString(),
        participants: selectedParticipants.map((p) => ({
          firstName: p.student.firstName,
          lastName: p.student.lastName,
          tcNumber: p.student.tcNumber,
          grade: p.student.grade,
          artworkDescription: p.artworkDescription ?? "",
          participationPhotoUrl: p.participationPhotoUrl ?? "",
        })),
      }
      html = buildGastronomiEtkinlikCertificateHTML(certData)
    } else if (event.certificateType === "MUZIK_ESER_ICRA") {
      const certData: MuzikEserIcraCertData = {
        title: event.title,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        teacherName: `${event.teacher.firstName} ${event.teacher.lastName}`,
        createdAt: event.createdAt.toISOString(),
        participants: selectedParticipants.map((p) => ({
          firstName: p.student.firstName,
          lastName: p.student.lastName,
          tcNumber: p.student.tcNumber,
          grade: p.student.grade,
          artworkDescription: p.artworkDescription ?? "",
          participationPhotoUrl: p.participationPhotoUrl ?? "",
        })),
      }
      html = buildMuzikEserIcraCertificateHTML(certData)
    } else if (event.certificateType === "BASKETBOL_EGITIM") {
      const certData: BasketbolEgitimCertData = {
        title: event.title,
        educationDescription: event.description || event.title,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        teacherName: `${event.teacher.firstName} ${event.teacher.lastName}`,
        organizerName: event.organizerName,
        createdAt: event.createdAt.toISOString(),
        participants: selectedParticipants.map((p) => ({
          firstName: p.student.firstName,
          lastName: p.student.lastName,
          tcNumber: p.student.tcNumber,
          grade: p.student.grade,
          score: p.score ?? 0,
        })),
      }
      html = buildBasketbolEgitimCertificateHTML(certData)
    } else if (event.certificateType === "BEDEN_EGITIMI_EGITIM") {
      const certData: BedenEgitimCertData = {
        title: event.title,
        educationDescription: event.description || event.title,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        teacherName: `${event.teacher.firstName} ${event.teacher.lastName}`,
        organizerName: event.organizerName,
        createdAt: event.createdAt.toISOString(),
        participants: selectedParticipants.map((p) => ({
          firstName: p.student.firstName,
          lastName: p.student.lastName,
          tcNumber: p.student.tcNumber,
          grade: p.student.grade,
          score: p.score ?? 0,
        })),
      }
      html = buildBedenEgitimCertificateHTML(certData)
    } else if (event.certificateType === "HENTBOL_EGITIM") {
      const certData: HentbolEgitimCertData = {
        title: event.title,
        educationDescription: event.description || event.title,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        teacherName: `${event.teacher.firstName} ${event.teacher.lastName}`,
        organizerName: event.organizerName,
        createdAt: event.createdAt.toISOString(),
        participants: selectedParticipants.map((p) => ({
          firstName: p.student.firstName,
          lastName: p.student.lastName,
          tcNumber: p.student.tcNumber,
          grade: p.student.grade,
          score: p.score ?? 0,
        })),
      }
      html = buildHentbolEgitimCertificateHTML(certData)
    } else if (event.certificateType === "VOLEYBOL_EGITIM") {
      const certData: VoleybolEgitimCertData = {
        title: event.title,
        educationDescription: event.description || event.title,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        teacherName: `${event.teacher.firstName} ${event.teacher.lastName}`,
        organizerName: event.organizerName,
        createdAt: event.createdAt.toISOString(),
        participants: selectedParticipants.map((p) => ({
          firstName: p.student.firstName,
          lastName: p.student.lastName,
          tcNumber: p.student.tcNumber,
          grade: p.student.grade,
          score: p.score ?? 0,
        })),
      }
      html = buildVoleybolEgitimCertificateHTML(certData)
    } else if (event.certificateType === "PROJE_KATILIM") {
      const meta = (event.metadata as Record<string, unknown> | null) ?? {}
      const achievementLevel =
        typeof meta.projectAchievementLevel === "string" && meta.projectAchievementLevel.trim()
          ? meta.projectAchievementLevel.trim()
          : "—"
      const certData: ProjeKatilimCertData = {
        projectDescription: event.description || event.title,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        teacherName: `${event.teacher.firstName} ${event.teacher.lastName}`,
        achievementLevel,
        createdAt: event.createdAt.toISOString(),
        participants: selectedParticipants.map((p) => ({
          firstName: p.student.firstName,
          lastName: p.student.lastName,
          tcNumber: p.student.tcNumber,
          grade: p.student.grade,
        })),
      }
      html = buildProjeKatilimCertificateHTML(certData)
    } else {
      return NextResponse.json({ error: "Bu sertifika tipi için PDF şablonu henüz tanımlı değil" }, { status: 400 })
    }

    const normalizedHtml = applyGlobalCertificateLayout(html)

    const pdfResult = await generatePDF(normalizedHtml, {
      format: "A4",
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
      disableGlobalLogo: true,
    })
    const pdfBuffer = Buffer.from(pdfResult)

    const safeTitle = event.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()
    const turnuvaSuffix =
      event.certificateType === "TURNUVA_KATILIM"
        ? pdfKind === "achievement"
          ? "-achievement"
          : "-participation"
        : ""
    const filename = `sertifika-${safeTitle}-${id.slice(0, 8)}${turnuvaSuffix}.pdf`

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("GET /api/activity-events/[id]/pdf error:", error)
    return NextResponse.json({ error: "PDF oluşturulurken hata oluştu" }, { status: 500 })
  }
}
