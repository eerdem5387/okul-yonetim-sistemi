import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/** GET /api/clubs/[id]/demands — kontenjan doluluk talepleri */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const club = await prisma.club.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        capacity: true,
        _count: { select: { selections: true, demandRequests: true } },
      },
    })
    if (!club) {
      return NextResponse.json({ error: "Kulüp bulunamadı" }, { status: 404 })
    }

    const demands = await prisma.clubDemandRequest.findMany({
      where: { clubId: id },
      orderBy: { createdAt: "asc" },
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
    })

    return NextResponse.json({
      club: {
        id: club.id,
        name: club.name,
        capacity: club.capacity,
        filled: club._count.selections,
        demandCount: club._count.demandRequests,
      },
      demands: demands.map((d) => ({
        id: d.id,
        createdAt: d.createdAt,
        note: d.note,
        student: d.student,
      })),
      total: demands.length,
    })
  } catch (error) {
    console.error("Error fetching club demands:", error)
    return NextResponse.json({ error: "Talepler alınamadı" }, { status: 500 })
  }
}

/** DELETE /api/clubs/[id]/demands?demandId= — talebi sil */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const demandId = request.nextUrl.searchParams.get("demandId")
    if (!demandId) {
      return NextResponse.json({ error: "demandId gerekli" }, { status: 400 })
    }
    const existing = await prisma.clubDemandRequest.findFirst({
      where: { id: demandId, clubId: id },
    })
    if (!existing) {
      return NextResponse.json({ error: "Talep bulunamadı" }, { status: 404 })
    }
    await prisma.clubDemandRequest.delete({ where: { id: demandId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting club demand:", error)
    return NextResponse.json({ error: "Talep silinemedi" }, { status: 500 })
  }
}
