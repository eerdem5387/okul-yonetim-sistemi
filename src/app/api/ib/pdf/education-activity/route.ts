import { NextRequest, NextResponse } from "next/server"
import { generateEducationActivityPDF } from "@/lib/ib-education-pdf"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      common,
      specific,
      participants,
    } = body as {
      common?: { title: string; startDate: string; endDate: string; organizer: string; description: string; participantIds: string[] }
      specific?: { educationType: string; educationDescription: string; teacherName: string; successScore: number | "" }
      participants?: Array<{ id: string; name: string; tcNumber: string; grade: string }>
    }

    if (!common || !specific || !Array.isArray(participants)) {
      return NextResponse.json(
        { error: "common, specific ve participants gerekli" },
        { status: 400 }
      )
    }

    const payload = {
      common: {
        title: common.title ?? "",
        startDate: common.startDate ?? "",
        endDate: common.endDate ?? "",
        organizer: common.organizer ?? "",
        description: common.description ?? "",
        participantIds: Array.isArray(common.participantIds) ? common.participantIds : [],
      },
      specific: {
        educationType: specific.educationType ?? "",
        educationDescription: specific.educationDescription ?? "",
        teacherName: specific.teacherName ?? "",
        successScore:
          specific.successScore !== undefined && specific.successScore !== ""
            ? Number(specific.successScore)
            : ("" as const),
      },
      participants: participants.map((p: { id: string; name: string; tcNumber: string; grade?: string }) => ({
        id: p.id,
        name: p.name ?? "",
        tcNumber: p.tcNumber ?? "",
        grade: p.grade ?? "",
      })),
    }

    const pdfBytes = await generateEducationActivityPDF(payload)

    const filename = "egitim-faaliyet-sertifika-ve-belgeler.pdf"
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("Education activity PDF error:", error)
    return NextResponse.json(
      { error: "PDF oluşturulurken hata oluştu" },
      { status: 500 }
    )
  }
}
