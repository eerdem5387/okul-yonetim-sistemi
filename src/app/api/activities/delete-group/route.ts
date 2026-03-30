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

/** Gruptaki tüm Activity kayıtlarını siler (anchorId ile). */
export async function POST(request: NextRequest) {
  const { hasAccess } = await checkIbAccess(request)
  if (!hasAccess) {
    return NextResponse.json({ error: "Bu işlem için yetkiniz bulunmamaktadır" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const anchorId = typeof body.anchorId === "string" ? body.anchorId : ""
    if (!anchorId) {
      return NextResponse.json({ error: "anchorId zorunludur" }, { status: 400 })
    }

    const anchor = await prisma.activity.findUnique({ where: { id: anchorId } })
    if (!anchor) {
      return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 })
    }

    const dayStart = startOfUtcDay(anchor.activityDate)
    const dayEnd = endOfUtcDay(anchor.activityDate)
    const catA = anchor.category ?? ""

    const candidates = await prisma.activity.findMany({
      where: {
        title: anchor.title,
        type: anchor.type,
        activityDate: { gte: dayStart, lte: dayEnd },
      },
      select: { id: true, category: true },
    })

    const ids = candidates.filter((a) => (a.category ?? "") === catA).map((a) => a.id)

    await prisma.activity.deleteMany({ where: { id: { in: ids } } })

    return NextResponse.json({ deleted: ids.length })
  } catch (error) {
    console.error("POST /api/activities/delete-group error:", error)
    return NextResponse.json({ error: "Grup silinemedi" }, { status: 500 })
  }
}
