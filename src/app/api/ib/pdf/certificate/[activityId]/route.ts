import { NextRequest, NextResponse } from "next/server"
import { readFileSync } from "fs"
import { join } from "path"
import { prisma } from "@/lib/prisma"
import { checkIbAccess } from "@/lib/access-control"
import { getBelgeTanimi } from "@/lib/ib-belge-tanimlari"
import {
  buildCertificateFieldValues,
  buildCertificateOutcomeParagraph,
  getCertificatePagesForActivity,
  type CertificateDataInput,
} from "@/lib/ib-certificate-data"
import type { CategoryId } from "@/lib/ib-activity-config"
import { generatePDF, generateCertificateHTML } from "@/lib/pdf-generator"

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
 * GET /api/ib/pdf/certificate/[activityId]?token=...&lang=tr|en
 * Sertifika / katılım / başarı belgesi PDF. Yetki: query token (IB viewer) veya Authorization Bearer (panel).
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ activityId: string }> }
) {
  try {
    const url = new URL(request.url)
    const tokenParam = url.searchParams.get("token")
    const { hasAccess } = await checkIbAccess(request)
    if (!tokenParam && !hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { activityId } = await context.params
    const language = (url.searchParams.get("lang") || "tr") as "tr" | "en"

    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
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
    })

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 })
    }

    const certData = (activity.certificateData || {}) as Record<string, unknown>
    const category = (certData.category ?? activity.category) as CategoryId | undefined
    const subtype: string =
      typeof certData.subtype === "string"
        ? certData.subtype
        : typeof activity.subtype === "string"
          ? activity.subtype
          : ""

    if (!category) {
      return NextResponse.json(
        { error: "Bu faaliyet için sertifika belgesi üretilemiyor (kategori yok)." },
        { status: 400 }
      )
    }
    if (category === "egitim" && !subtype) {
      return NextResponse.json(
        { error: "Bu faaliyet için sertifika belgesi üretilemiyor (eğitim alt türü yok)." },
        { status: 400 }
      )
    }

    const successScore =
      certData.successScore != null ? Number(certData.successScore) : null
    const hasScore = successScore != null && !Number.isNaN(successScore)
    const pages = getCertificatePagesForActivity(category, subtype, hasScore)

    if (pages.length === 0) {
      return NextResponse.json(
        { error: "Bu faaliyet türü için sertifika tanımı bulunamadı." },
        { status: 400 }
      )
    }

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

    const htmlParts: string[] = []
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
      htmlParts.push(
        generateCertificateHTML({
          logoBase64,
          certificateTitle: title.toUpperCase(),
          fields,
          outcomeParagraph: outcomeParagraph || undefined,
          language,
        })
      )
    }

    if (htmlParts.length === 0) {
      return NextResponse.json(
        { error: "Belge sayfası oluşturulamadı." },
        { status: 500 }
      )
    }

    const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
  </style>
</head>
<body>
  ${htmlParts.join("")}
</body>
</html>
    `

    const pdf = await generatePDF(fullHtml)

    const safeName = `${activity.student.firstName}-${activity.student.lastName}`.replace(
      /[^a-zA-Z0-9-_]/g,
      "-"
    )
    const fileName =
      language === "en"
        ? `ib-certificate-${safeName}.pdf`
        : `ib-sertifika-${safeName}.pdf`

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error("Error generating IB certificate PDF:", error)
    return NextResponse.json(
      { error: "Sertifika PDF oluşturulurken hata oluştu." },
      { status: 500 }
    )
  }
}
