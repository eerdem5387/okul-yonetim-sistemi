import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkIbAccess } from "@/lib/access-control"
import { generatePDF } from "@/lib/pdf-generator"
import { buildActivityPdfHtml } from "@/lib/activity-pdf"

/**
 * Tam HTML'den sadece <body> içeriğini çıkarır.
 */
function extractBodyContent(fullHtml: string): string {
  const match = fullHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  return match ? match[1] : ""
}

/**
 * POST /api/activities/batch-pdf
 * Birden fazla faaliyet için tek PDF döner. Her faaliyet (her öğrenci) için ayrı rapor + sertifika/belge sayfaları oluşturulur.
 * Body: { activityIds: string[] }
 */
export async function POST(request: NextRequest) {
  const { hasAccess } = await checkIbAccess(request)
  if (!hasAccess) {
    return NextResponse.json({ error: "Bu işlem için yetkiniz yok" }, { status: 403 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const activityIds = Array.isArray(body.activityIds) ? body.activityIds as string[] : []
    // Panelden toplu indirilen IB faaliyet PDF'leri zorunlu olarak İngilizce üretilir.
    const language: "en" = "en"

    if (activityIds.length === 0) {
      return NextResponse.json(
        { error: "En az bir faaliyet id'si gönderin (activityIds)." },
        { status: 400 }
      )
    }
    if (activityIds.length > 50) {
      return NextResponse.json(
        { error: "En fazla 50 faaliyet seçebilirsiniz." },
        { status: 400 }
      )
    }

    const activities = await prisma.activity.findMany({
      where: { id: { in: activityIds } },
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
      orderBy: [{ activityDate: "asc" }, { title: "asc" }],
    })

    if (activities.length === 0) {
      return NextResponse.json({ error: "Faaliyet bulunamadı" }, { status: 404 })
    }

    const htmlParts = activities.map((activity) => buildActivityPdfHtml(activity, language))
    const firstHtml = htmlParts[0]
    const restBodies = htmlParts.slice(1).map(extractBodyContent)
    const combinedBody = extractBodyContent(firstHtml) + restBodies.join("")
    const mergedHtml = firstHtml.replace(/<body[^>]*>[\s\S]*?<\/body>/i, `<body>${combinedBody}</body>`)

    const pdf = await generatePDF(mergedHtml)

    const safeTitle = (activities[0]?.title ?? "faaliyet").replace(/[^a-zA-Z0-9-_]/g, "-")
    const fileName =
      language === "en"
        ? `ib-activity-${safeTitle}-${activities.length}-students.pdf`
        : `ib-faaliyet-${safeTitle}-${activities.length}-ogrenci.pdf`

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error("Error generating batch activity PDF:", error)
    return NextResponse.json({ error: "PDF oluşturulurken hata oluştu" }, { status: 500 })
  }
}
