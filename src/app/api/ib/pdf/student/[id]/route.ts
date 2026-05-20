import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generatePDF, generateIBActivityReportHTML } from "@/lib/pdf-generator"
import { requireIbViewerFromRequest } from "@/lib/ib-viewer-auth"
import { getApprovedActivitiesForStudentPdf } from "@/lib/ib-viewer-data"
import { IB_MAIN_TYPE_LABELS } from "@/lib/ib-activity-types"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireIbViewerFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const params = await context.params
    const studentId = params.id
    const language = (new URL(request.url).searchParams.get("lang") || "tr") as "tr" | "en"

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        grade: true,
        birthDate: true,
      },
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    if (!student.birthDate) {
      return NextResponse.json({ error: "Student birth date is missing" }, { status: 400 })
    }

    const approvedRows = await getApprovedActivitiesForStudentPdf(studentId)

    const html = generateIBActivityReportHTML({
      student: {
        firstName: student.firstName,
        lastName: student.lastName,
        grade: student.grade,
        birthDate: student.birthDate.toISOString(),
      },
      activities: approvedRows.map((row) => ({
        type: IB_MAIN_TYPE_LABELS[row.mainTypeLabel],
        title: row.title,
        description: row.description,
        activityDate: row.startDate.toISOString(),
        location: null,
        organizer: row.organizerName,
        duration: null,
        participants: null,
        outcome: row.outcome,
        evidence: "",
        notes: null,
        verifiedAt: row.endDate.toISOString(),
      })),
      language,
    })

    const pdf = await generatePDF(html)

    const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9-_]/g, "-")
    const safeFirstName = sanitizeFileName(student.firstName)
    const safeLastName = sanitizeFileName(student.lastName)

    const fileName =
      language === "en"
        ? `ib-activity-report-${safeFirstName}-${safeLastName}.pdf`
        : `ib-faaliyet-raporu-${safeFirstName}-${safeLastName}.pdf`

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error("Error generating IB activity report PDF:", error)
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 })
  }
}
