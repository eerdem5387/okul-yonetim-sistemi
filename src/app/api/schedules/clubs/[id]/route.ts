import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { assertClubSlotFree, assertEtutSlot } from "@/lib/schedules/club-schedule"

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
    },
  },
} as const

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const existing = await prisma.clubSchedule.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const clubId = String(body.clubId ?? existing.clubId).trim()
    const dayOfWeek = parseInt(String(body.dayOfWeek ?? existing.dayOfWeek), 10)
    const startTime = String(body.startTime ?? existing.startTime).trim()
    const endTime = String(body.endTime ?? existing.endTime).trim()
    const room =
      body.room !== undefined
        ? typeof body.room === "string"
          ? body.room.trim() || null
          : null
        : existing.room
    const notes =
      body.notes !== undefined
        ? typeof body.notes === "string"
          ? body.notes.trim() || null
          : null
        : existing.notes
    const hasInstructor = Object.prototype.hasOwnProperty.call(body, "instructorId")
    const instructorId = hasInstructor
      ? body.instructorId
        ? String(body.instructorId).trim()
        : null
      : undefined

    if (instructorId) {
      const teacher = await prisma.staff.findUnique({ where: { id: instructorId } })
      if (!teacher || teacher.department !== "OGRETMEN") {
        return NextResponse.json({ error: "Geçerli bir öğretmen seçiniz" }, { status: 400 })
      }
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
      excludeId: id,
      instructorIdOverride: instructorId,
    })
    if (freeErr) {
      return NextResponse.json({ error: freeErr }, { status: 400 })
    }

    const row = await prisma.$transaction(async (tx) => {
      if (hasInstructor) {
        await tx.club.update({
          where: { id: clubId },
          data: { instructorId },
        })
      }
      return tx.clubSchedule.update({
        where: { id },
        data: { clubId, dayOfWeek, startTime, endTime, room, notes },
        include: scheduleInclude,
      })
    })

    return NextResponse.json({ success: true, schedule: row })
  } catch (error) {
    console.error("Error updating club schedule:", error)
    return NextResponse.json({ error: "Güncellenemedi" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const existing = await prisma.clubSchedule.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 })
    }
    await prisma.clubSchedule.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting club schedule:", error)
    return NextResponse.json({ error: "Silinemedi" }, { status: 500 })
  }
}
