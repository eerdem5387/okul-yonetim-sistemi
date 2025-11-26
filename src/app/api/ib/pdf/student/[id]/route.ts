import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generatePDF, generateIBActivityReportHTML } from "@/lib/pdf-generator"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // IB Viewer authentication check
    const url = new URL(request.url)
    const tokenParam = url.searchParams.get("token")
    
    // For now, we'll accept token from query params (in production, use proper JWT validation)
    // The token is stored in localStorage on client side and passed as query param
    if (!tokenParam) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const params = await context.params
    const studentId = params.id
    const language = (new URL(request.url).searchParams.get("lang") || "tr") as "tr" | "en"

    // Fetch student
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

    // Fetch verified activities for this student
    const activities = await prisma.activity.findMany({
      where: {
        studentId: studentId,
        isVerified: true,
      },
      orderBy: {
        activityDate: "desc",
      },
    })

    // Generate HTML
    const html = generateIBActivityReportHTML({
      student: {
        firstName: student.firstName,
        lastName: student.lastName,
        grade: student.grade,
        birthDate: student.birthDate.toISOString(),
      },
      activities: activities.map((activity) => ({
        type: activity.type,
        title: activity.title,
        description: activity.description,
        activityDate: activity.activityDate.toISOString(),
        location: activity.location,
        organizer: activity.organizer,
        duration: activity.duration,
        participants: activity.participants,
        outcome: activity.outcome,
        evidence: activity.evidence,
        verifiedAt: activity.verifiedAt?.toISOString() || null,
      })),
      language,
    })

    // Generate PDF
    const pdf = await generatePDF(html)

    const fileName = language === "en"
      ? `ib-activity-report-${student.firstName}-${student.lastName}.pdf`
      : `ib-faaliyet-raporu-${student.firstName}-${student.lastName}.pdf`

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

