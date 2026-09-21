import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { canManageClubRoster, resolveClubStaffActor } from "@/lib/clubs/access"

export const dynamic = "force-dynamic"

const requestInclude = {
  club: { select: { id: true, name: true, capacity: true } },
  student: { select: { id: true, firstName: true, lastName: true, grade: true, tcNumber: true } },
  requestedBy: { select: { id: true, firstName: true, lastName: true } },
  reviewedBy: { select: { id: true, firstName: true, lastName: true } },
} as const

/** Yönetim: bekleyen üyelik talepleri */
export async function GET(request: NextRequest) {
  const actor = await resolveClubStaffActor(request)
  if (!actor || !canManageClubRoster(actor)) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 })
  }

  const status = request.nextUrl.searchParams.get("status") || "PENDING"
  const clubId = request.nextUrl.searchParams.get("clubId") || undefined

  const requests = await prisma.clubMembershipRequest.findMany({
    where: {
      status: status === "ALL" ? undefined : (status as "PENDING" | "APPROVED" | "REJECTED"),
      ...(clubId ? { clubId } : {}),
    },
    include: requestInclude,
    orderBy: { createdAt: "desc" },
    take: 200,
  })

  return NextResponse.json({ requests })
}

/** Yönetim: onayla / reddet */
export async function POST(request: NextRequest) {
  const actor = await resolveClubStaffActor(request)
  if (!actor || !canManageClubRoster(actor)) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const id = String(body.id ?? "").trim()
  const decision = body.decision === "reject" ? "reject" : body.decision === "approve" ? "approve" : null
  if (!id || !decision) {
    return NextResponse.json({ error: "id ve decision gerekli" }, { status: 400 })
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const row = await tx.clubMembershipRequest.findUnique({
        where: { id },
        include: {
          club: { include: { _count: { select: { selections: true } } } },
        },
      })
      if (!row) throw new Error("NOT_FOUND")
      if (row.status !== "PENDING") throw new Error("NOT_PENDING")

      if (decision === "reject") {
        return tx.clubMembershipRequest.update({
          where: { id },
          data: {
            status: "REJECTED",
            reviewedById: actor.staffId,
            reviewedAt: new Date(),
          },
          include: requestInclude,
        })
      }

      if (row.changeType === "ADD") {
        const existing = await tx.clubSelection.findUnique({
          where: { studentId_clubId: { studentId: row.studentId, clubId: row.clubId } },
        })
        if (!existing) {
          if (row.club._count.selections >= row.club.capacity) {
            throw new Error("FULL")
          }
          await tx.clubSelection.create({
            data: { clubId: row.clubId, studentId: row.studentId },
          })
        }
      } else {
        await tx.clubSelection.deleteMany({
          where: { clubId: row.clubId, studentId: row.studentId },
        })
      }

      return tx.clubMembershipRequest.update({
        where: { id },
        data: {
          status: "APPROVED",
          reviewedById: actor.staffId,
          reviewedAt: new Date(),
        },
        include: requestInclude,
      })
    })

    return NextResponse.json({ success: true, request: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    if (message === "NOT_FOUND") {
      return NextResponse.json({ error: "Talep bulunamadı" }, { status: 404 })
    }
    if (message === "NOT_PENDING") {
      return NextResponse.json({ error: "Talep zaten sonuçlandırılmış" }, { status: 409 })
    }
    if (message === "FULL") {
      return NextResponse.json({ error: "Kulüp kontenjanı dolu" }, { status: 400 })
    }
    console.error("Club membership decide error:", error)
    return NextResponse.json({ error: "İşlem tamamlanamadı" }, { status: 500 })
  }
}
