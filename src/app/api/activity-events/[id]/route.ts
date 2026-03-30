import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkActivityAccess } from "@/lib/access-control"

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
    const event = await prisma.activityEvent.findUnique({
      where: { id },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true, department: true } },
        participants: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                grade: true,
                tcNumber: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    })

    if (!event) {
      return NextResponse.json({ error: "Faaliyet bulunamadı" }, { status: 404 })
    }

    return NextResponse.json(event)
  } catch (error) {
    console.error("GET /api/activity-events/[id] error:", error)
    return NextResponse.json({ error: "Faaliyet yüklenirken hata oluştu" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { hasAccess } = await checkActivityAccess(request)
  if (!hasAccess) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 })
  }

  try {
    const { id } = await context.params
    const body = await request.json()

    const existing = await prisma.activityEvent.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Faaliyet bulunamadı" }, { status: 404 })
    }

    const {
      title,
      description,
      outcome,
      location,
      organizerName,
      durationHours,
      durationDays,
      durationMonths,
      durationYears,
      evidenceUrls,
      teacherId,
    } = body

    const updated = await prisma.activityEvent.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description: description || null }),
        ...(outcome !== undefined && { outcome: outcome || null }),
        ...(location !== undefined && { location: location || null }),
        ...(organizerName !== undefined && { organizerName }),
        ...(durationHours !== undefined && { durationHours: durationHours ? parseInt(durationHours) : null }),
        ...(durationDays !== undefined && { durationDays: durationDays ? parseInt(durationDays) : null }),
        ...(durationMonths !== undefined && { durationMonths: durationMonths ? parseInt(durationMonths) : null }),
        ...(durationYears !== undefined && { durationYears: durationYears ? parseInt(durationYears) : null }),
        ...(evidenceUrls !== undefined && { evidenceUrls }),
        ...(teacherId !== undefined && { teacherId }),
      },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        participants: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true, grade: true } },
          },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("PUT /api/activity-events/[id] error:", error)
    return NextResponse.json({ error: "Faaliyet güncellenirken hata oluştu" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { hasAccess } = await checkActivityAccess(request)
  if (!hasAccess) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 })
  }

  try {
    const { id } = await context.params

    const existing = await prisma.activityEvent.findUnique({
      where: { id },
      include: { participants: { select: { verificationStatus: true } } },
    })

    if (!existing) {
      return NextResponse.json({ error: "Faaliyet bulunamadı" }, { status: 404 })
    }

    const hasApproved = existing.participants.some(
      (p) => p.verificationStatus === "ONAYLANDI"
    )
    if (hasApproved) {
      return NextResponse.json(
        { error: "Onaylanmış katılımcısı olan faaliyet silinemez" },
        { status: 409 }
      )
    }

    await prisma.activityEvent.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/activity-events/[id] error:", error)
    return NextResponse.json({ error: "Faaliyet silinirken hata oluştu" }, { status: 500 })
  }
}
