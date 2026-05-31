import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkActivityAccess } from "@/lib/access-control"

/** Faaliyet formu «Sorumlu Öğretmen» listesi — activity_events.view yeterli (staff.view gerekmez). */
export async function GET(request: NextRequest) {
  const { hasAccess } = await checkActivityAccess(request)
  if (!hasAccess) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 })
  }

  try {
    const teachers = await prisma.staff.findMany({
      where: {
        department: "OGRETMEN",
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 2000,
    })

    return NextResponse.json({ teachers })
  } catch (error) {
    console.error("GET /api/activity-events/teachers error:", error)
    return NextResponse.json({ error: "Öğretmen listesi alınamadı" }, { status: 500 })
  }
}
