import { NextRequest, NextResponse } from "next/server"
import { readFileSync } from "fs"
import { join } from "path"
import { prisma } from "@/lib/prisma"
import { checkIbAccess } from "@/lib/access-control"
import { getMufredatIcerikIdForSubtype, type CategoryId } from "@/lib/ib-activity-config"
import { getMufredatYapisi } from "@/lib/ib-mufredat-icerikleri"
import { getBelgeTanimi } from "@/lib/ib-belge-tanimlari"
import {
  buildCertificateFieldValues,
  buildCertificateOutcomeParagraph,
  getCertificatePagesForActivity,
  type CertificateDataInput,
} from "@/lib/ib-certificate-data"
import { generatePDF, generateIBActivityReportHTML, generateMufredatPageHTML, generateCertificateHTML } from "@/lib/pdf-generator"

function getLogoBase64(): string {
  try {
    const path = join(process.cwd(), "public", "logo.png")
    const buf = readFileSync(path)
    return buf.toString("base64")
  } catch {
    return ""
  }
}

/**
 * GET /api/activities/[id]/pdf
 * Panel kullanıcıları (Bearer) faaliyet PDF'ini indirir. Doğrulama durumuna bakılmaz (imza süreci için).
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { hasAccess } = await checkIbAccess(request)
  if (!hasAccess) {
    return NextResponse.json({ error: "Bu işlem için yetkiniz yok" }, { status: 403 })
  }

  try {
    const params = await context.params
    const activityId = params.id
    const language = (new URL(request.url).searchParams.get("lang") || "tr") as "tr" | "en"

    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            grade: true,
            birthDate: true,
            tcNumber: true,
          },
        },
      },
    })

    if (!activity) {
      return NextResponse.json({ error: "Faaliyet bulunamadı" }, { status: 404 })
    }

    const birthDateStr = activity.student.birthDate
      ? activity.student.birthDate.toISOString()
      : ""

    let mufredatHtml: string | undefined
    const category = (activity.category ?? (activity.certificateData as Record<string, unknown>)?.category) as CategoryId | undefined
    const subtype = (activity.subtype ?? (activity.certificateData as Record<string, unknown>)?.subtype) as string | undefined
    if (category && subtype) {
      const mufredatId = getMufredatIcerikIdForSubtype(category, subtype)
      const yapisi = mufredatId ? getMufredatYapisi(mufredatId) : null
      if (yapisi && yapisi.months.length > 0) {
        const logoBase64 = getLogoBase64()
        mufredatHtml = generateMufredatPageHTML({
          logoBase64,
          programTitle: yapisi.programTitle,
          participantName: `${activity.student.firstName} ${activity.student.lastName}`.trim(),
          participantTrId: activity.student.tcNumber ?? "",
          instructorName: activity.organizer ?? "",
          programmeDurationWeeks: "40 weeks",
          months: yapisi.months,
        })
      }
    }

    let html = generateIBActivityReportHTML({
      student: {
        firstName: activity.student.firstName,
        lastName: activity.student.lastName,
        grade: activity.student.grade,
        birthDate: birthDateStr,
      },
      activities: [
        {
          type: activity.type as string,
          title: activity.title,
          description: activity.description,
          activityDate: activity.activityDate.toISOString(),
          location: activity.location,
          organizer: activity.organizer,
          duration: activity.duration,
          participants: activity.participants,
          outcome: activity.outcome,
          evidence: activity.evidence || "",
          notes: activity.notes,
          verifiedAt: activity.verifiedAt?.toISOString() || null,
        },
      ],
      language,
      mufredatHtml,
    })

    const certData = (activity.certificateData || {}) as Record<string, unknown>
    const successScore =
      certData.successScore != null ? Number(certData.successScore) : null
    const hasSuccessScore = successScore != null && !Number.isNaN(successScore)
    const pages =
      category && (category !== "egitim" || subtype)
        ? getCertificatePagesForActivity(category, subtype ?? "", hasSuccessScore)
        : []

    if (pages.length > 0) {
      const logoBase64 = getLogoBase64()
      const input: CertificateDataInput = {
        student: {
          firstName: activity.student.firstName,
          lastName: activity.student.lastName,
          tcNumber: activity.student.tcNumber,
          grade: activity.student.grade,
        },
        activity: {
          title: activity.title,
          organizer: activity.organizer,
          activityDate: activity.activityDate,
        },
        certificateData: certData,
        language,
        successScore: successScore ?? undefined,
      }

      const certificateParts: string[] = []
      for (const { belgeId, withOutcome } of pages) {
        const belge = getBelgeTanimi(belgeId)
        if (!belge) continue

        const values = buildCertificateFieldValues(belgeId, input)
        const labelKey = language === "tr" ? "labelTR" : "labelEN"
        const fields = belge.fields.map((f) => ({
          label: f[labelKey],
          value: values[f.key] ?? "",
        }))
        const outcomeParagraph = withOutcome
          ? buildCertificateOutcomeParagraph(belgeId, input, successScore)
          : ""
        const title = language === "tr" ? belge.nameTR : belge.nameEN
        certificateParts.push(
          `<div class="certificate-page">${generateCertificateHTML({
            logoBase64,
            certificateTitle: title.toUpperCase(),
            fields,
            outcomeParagraph: outcomeParagraph || undefined,
            language,
          })}</div>`
        )
      }

      const certificatePagesHtml = certificateParts.join("")
      const landscapeStyle =
        '<style>@page certificate { size: A4 landscape; } .certificate-page { page: certificate; }</style>'
      html = html.replace("</head>", `${landscapeStyle}</head>`).replace("</body>", `${certificatePagesHtml}</body>`)
    }

    const pdf = await generatePDF(html)

    const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9-_]/g, "-")
    const safeFirstName = sanitizeFileName(activity.student.firstName)
    const safeLastName = sanitizeFileName(activity.student.lastName)
    const safeTitle = sanitizeFileName(activity.title)
    const fileName = language === "en"
      ? `ib-activity-${safeTitle}-${safeFirstName}-${safeLastName}.pdf`
      : `ib-faaliyet-${safeTitle}-${safeFirstName}-${safeLastName}.pdf`

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error("Error generating activity PDF:", error)
    return NextResponse.json({ error: "PDF oluşturulurken hata oluştu" }, { status: 500 })
  }
}
