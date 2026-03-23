import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkIbAccess } from "@/lib/access-control"
import { generatePDF } from "@/lib/pdf-generator"
import { buildActivityPdfHtml } from "@/lib/activity-pdf"

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
    // Panelden indirilen IB faaliyet PDF'leri zorunlu olarak İngilizce üretilir.
    const language = "en" as const

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

    const html = buildActivityPdfHtml(activity, language)
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
