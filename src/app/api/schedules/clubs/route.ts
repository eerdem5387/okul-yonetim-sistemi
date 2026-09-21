import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  assertClubSlotFree,
  assertEtutSlot,
  DAY_LABELS,
  loadEtutSlots,
} from "@/lib/schedules/club-schedule"

export const dynamic = "force-dynamic"

const scheduleInclude = {
  club: {
    select: {
      id: true,
      name: true,
      capacity: true,
      gradeLevels: true,
      instructorId: true,
      instructor: {
        select: { id: true, firstName: true, lastName: true, subject: true },
      },
      _count: { select: { selections: true } },
      selections: {
        select: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              grade: true,
            },
          },
        },
        take: 80,
      },
    },
  },
} as const

/** GET /api/schedules/clubs — kulüp programları + etüt slotları + kulüp listesi */
export async function GET() {
  try {
    const [schedules, clubs, etutSlots] = await Promise.all([
      prisma.clubSchedule.findMany({
        where: { isActive: true },
        include: scheduleInclude,
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      }),
      prisma.club.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          capacity: true,
          gradeLevels: true,
          instructorId: true,
          instructor: {
            select: { id: true, firstName: true, lastName: true, subject: true },
          },
          _count: { select: { selections: true } },
        },
      }),
      loadEtutSlots(),
    ])

    return NextResponse.json({ schedules, clubs, etutSlots })
  } catch (error) {
    console.error("Error fetching club schedules:", error)
    return NextResponse.json({ error: "Kulüp programları alınamadı" }, { status: 500 })
  }
}

/** POST /api/schedules/clubs — { clubId, dayOfWeek, startTime, endTime, room?, notes? } */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const clubId = String(body.clubId ?? "").trim()
    const dayOfWeek = parseInt(String(body.dayOfWeek ?? ""), 10)
    const startTime = String(body.startTime ?? "").trim()
    const endTime = String(body.endTime ?? "").trim()
    const room = typeof body.room === "string" ? body.room.trim() || null : null
    const notes = typeof body.notes === "string" ? body.notes.trim() || null : null

    if (!clubId || !dayOfWeek || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Kulüp, gün ve etüt saati zorunludur" },
        { status: 400 }
      )
    }
    if (dayOfWeek < 1 || dayOfWeek > 7) {
      return NextResponse.json({ error: "Geçersiz gün" }, { status: 400 })
    }

    const etutErr = await assertEtutSlot(startTime, endTime)
    if (etutErr) {
      return NextResponse.json({ error: etutErr }, { status: 400 })
    }

    const freeErr = await assertClubSlotFree({
      clubId,
      dayOfWeek,
      startTime,
      endTime,
    })
    if (freeErr) {
      return NextResponse.json({ error: freeErr }, { status: 400 })
    }

    const row = await prisma.clubSchedule.create({
      data: { clubId, dayOfWeek, startTime, endTime, room, notes },
      include: scheduleInclude,
    })

    return NextResponse.json({
      success: true,
      schedule: row,
      message: `${DAY_LABELS[dayOfWeek] || "Gün"} ${startTime}–${endTime} kulüp programına eklendi`,
    })
  } catch (error) {
    console.error("Error creating club schedule:", error)
    return NextResponse.json({ error: "Kulüp programı oluşturulamadı" }, { status: 500 })
  }
}
