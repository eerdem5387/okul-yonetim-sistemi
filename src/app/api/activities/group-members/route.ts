import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkIbAccess } from "@/lib/access-control"

function startOfUtcDay(d: Date): Date {
  const x = new Date(d)
  x.setUTCHours(0, 0, 0, 0)
  return x
}

function endOfUtcDay(d: Date): Date {
  const x = new Date(d)
  x.setUTCHours(23, 59, 59, 999)
  return x
}

/** Aynı gün + başlık + tip + kategori ile gruplanmış IB Activity kayıtlarını döndürür (anchor = herhangi bir id). */
export async function GET(request: NextRequest) {
  const { hasAccess } = await checkIbAccess(request)
  if (!hasAccess) {
    return NextResponse.json({ error: "Bu işlem için yetkiniz bulunmamaktadır" }, { status: 403 })
  }

  const anchorId = request.nextUrl.searchParams.get("anchorId")
  if (!anchorId) {
    return NextResponse.json({ error: "anchorId zorunludur" }, { status: 400 })
  }

  try {
    const anchor = await prisma.activity.findUnique({
      where: { id: anchorId },
    })
    if (!anchor) {
      return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 })
    }

    const dayStart = startOfUtcDay(anchor.activityDate)
    const dayEnd = endOfUtcDay(anchor.activityDate)

    const candidates = await prisma.activity.findMany({
      where: {
        title: anchor.title,
        type: anchor.type,
        activityDate: { gte: dayStart, lte: dayEnd },
      },
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
      orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
    })

    const catA = anchor.category ?? ""
    const members = candidates.filter((a) => (a.category ?? "") === catA)

    return NextResponse.json({
      anchor: {
        id: anchor.id,
        title: anchor.title,
        type: anchor.type,
        category: anchor.category,
        activityDate: anchor.activityDate.toISOString(),
        location: anchor.location,
        organizer: anchor.organizer,
        description: anchor.description,
      },
      members,
    })
  } catch (error) {
    console.error("GET /api/activities/group-members error:", error)
    return NextResponse.json({ error: "Grup yüklenemedi" }, { status: 500 })
  }
}
