import { NextRequest, NextResponse } from "next/server"
import { readFileSync } from "fs"
import { join } from "path"
import { prisma } from "@/lib/prisma"
import { getMufredatIcerikIdForSubtype, type CategoryId } from "@/lib/ib-activity-config"
import { getMufredatYapisi } from "@/lib/ib-mufredat-icerikleri"
import { generatePDF, generateIBActivityReportHTML, generateMufredatPageHTML } from "@/lib/pdf-generator"

function getLogoBase64(): string {
  try {
    const path = join(process.cwd(), "public", "logo.png")
    const buf = readFileSync(path)
    return buf.toString("base64")
  } catch {
    return ""
  }
}

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
            tcNumber: true,
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

    let mufredatHtml: string | undefined
    const certData = activity.certificateData as Record<string, unknown> | null
    const category = certData?.category as CategoryId | undefined
    const subtype = certData?.subtype as string | undefined
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

