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
    
    if (!tokenParam) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const params = await context.params
    const activityId = params.id
    const language = (new URL(request.url).searchParams.get("lang") || "tr") as "tr" | "en"

    // Fetch single activity
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
          },
        },
      },
    })

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 })
    }

    // Only verified activities can be downloaded
    if (!activity.isVerified) {
      return NextResponse.json({ error: "Activity is not verified" }, { status: 403 })
    }

    if (!activity.student.birthDate) {
      return NextResponse.json({ error: "Student birth date is missing" }, { status: 400 })
    }

    // Generate HTML for single activity
    const html = generateIBActivityReportHTML({
      student: {
        firstName: activity.student.firstName,
        lastName: activity.student.lastName,
        grade: activity.student.grade,
        birthDate: activity.student.birthDate.toISOString(),
      },
      activities: [
        {
          type: activity.type as string,
          title: activity.title,
          description: activity.description || null,
          activityDate: activity.activityDate.toISOString(),
          location: activity.location || null,
          organizer: activity.organizer || null,
          duration: activity.duration,
          participants: activity.participants,
          outcome: activity.outcome || null,
          evidence: activity.evidence || "",
          notes: activity.notes || null,
          verifiedAt: activity.verifiedAt?.toISOString() || null,
        },
      ],
      language,
    })

    // Generate PDF
    const pdf = await generatePDF(html)

    // Sanitize file name
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
    console.error("Error generating IB activity PDF:", error)
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 })
  }
}

