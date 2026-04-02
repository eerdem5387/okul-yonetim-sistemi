import { NextRequest, NextResponse } from "next/server"
import { readFileSync } from "fs"
import { join } from "path"
import { prisma } from "@/lib/prisma"
import { checkActivityAccess } from "@/lib/access-control"
import { generatePDF, generateMufredatPageHTML } from "@/lib/pdf-generator"
import { getSubtypeConfig, type ActivityMainType, type MufredatHafta } from "@/lib/activity-types-config"

function getLogoBase64(): string {
  try {
    return readFileSync(join(process.cwd(), "public", "logo.png")).toString("base64")
  } catch {
    return ""
  }
}

function buildMufredatHtml(params: {
  mainType: string
  subtype: string | null
  teacherName: string
  participants: Array<{ firstName: string; lastName: string; tcNumber: string }>
}) {
  const cfg = getSubtypeConfig(params.mainType as ActivityMainType, params.subtype ?? "")
  const mufredat = cfg?.mufredat
  if (!mufredat?.length) return ""

  const monthsMap = new Map<string, Array<{
    week: string
    subject: string
    objective: string
    practice: string
    achievements: string
  }>>()

  for (const row of mufredat as MufredatHafta[]) {
    const month = row.ay?.trim() || "MUFREDAT"
    const bucket = monthsMap.get(month) ?? []
    bucket.push({
      week: typeof row.hafta === "number" ? `${row.hafta}. Hafta` : String(row.hafta),
      subject: row.konu ?? "",
      objective: row.hedef ?? "",
      practice: row.icerik ?? "",
      achievements: row.hedef ?? "",
    })
    monthsMap.set(month, bucket)
  }

  const months = [...monthsMap.entries()].map(([label, rows]) => ({ label, rows }))
  const logoBase64 = getLogoBase64()
  const programTitle = cfg?.mufredatBaslik ?? "LEVENT COLLEGE IB PROGRAMME — Curriculum"

  return params.participants
    .map((p, idx) =>
      generateMufredatPageHTML({
        logoBase64,
        programTitle,
        showLogo: idx === 0,
        participantName: `${p.firstName} ${p.lastName}`.trim(),
        participantTrId: p.tcNumber,
        instructorName: params.teacherName,
        programmeDurationWeeks: "40 weeks",
        months,
      })
    )
    .join("")
}

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
    const participantId = request.nextUrl.searchParams.get("participantId")

    const event = await prisma.activityEvent.findUnique({
      where: { id },
      include: {
        teacher: { select: { firstName: true, lastName: true } },
        participants: {
          include: {
            student: { select: { firstName: true, lastName: true, tcNumber: true } },
          },
        },
      },
    })

    if (!event) {
      return NextResponse.json({ error: "Faaliyet bulunamadı" }, { status: 404 })
    }

    const selectedParticipants = participantId
      ? event.participants.filter((p) => p.id === participantId)
      : event.participants
    if (!selectedParticipants.length) {
      return NextResponse.json({ error: "Katılımcı bulunamadı" }, { status: 404 })
    }

    const html = buildMufredatHtml({
      mainType: event.mainType,
      subtype: event.subtype,
      teacherName: `${event.teacher.firstName} ${event.teacher.lastName}`,
      participants: selectedParticipants.map((p) => ({
        firstName: p.student.firstName,
        lastName: p.student.lastName,
        tcNumber: p.student.tcNumber,
      })),
    })

    if (!html) {
      return NextResponse.json({ error: "Bu faaliyet alt türü için müfredat tanımlı değil" }, { status: 400 })
    }

    const pdfResult = await generatePDF(html, {
      format: "A4",
      margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
      // Müfredat PDF’inde sağ üstte sabitlenen global logo overlay'i her sayfada tekrar basıyor.
      // Sadece müfredat şablonunun ilk sayfasındaki ortalı logoyu göstermek istiyoruz.
      disableGlobalLogo: true,
    })
    const pdfBuffer = Buffer.from(pdfResult)
    const filename = participantId
      ? `mufredat-${id.slice(0, 8)}-${participantId.slice(0, 8)}.pdf`
      : `mufredat-${id.slice(0, 8)}.pdf`

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("GET /api/activity-events/[id]/mufredat-pdf error:", error)
    return NextResponse.json({ error: "Müfredat PDF oluşturulurken hata oluştu" }, { status: 500 })
  }
}
