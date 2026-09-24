import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  assertStudentsFreeForStudySession,
  assertTeacherFreeForStudySession,
} from "@/lib/schedules/study-group-conflicts"

export const dynamic = "force-dynamic"

const sessionInclude = {
  teacher: {
    select: { id: true, firstName: true, lastName: true, subject: true },
  },
  studyGroup: {
    select: {
      id: true,
      name: true,
      students: { select: { studentId: true } },
    },
  },
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await context.params
    const existing = await prisma.studyGroupSession.findUnique({
      where: { id: sessionId },
      include: { studyGroup: { include: { students: { select: { studentId: true } } } } },
    })
    if (!existing) {
      return NextResponse.json({ error: "Atama bulunamadı" }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const teacherId = String(body.teacherId ?? existing.teacherId).trim()
    const dayOfWeek = parseInt(String(body.dayOfWeek ?? existing.dayOfWeek), 10)
    const startTime = String(body.startTime ?? existing.startTime).trim()
    const endTime = String(body.endTime ?? existing.endTime).trim()
    const room =
      body.room !== undefined
        ? typeof body.room === "string"
          ? body.room.trim() || null
          : null
        : existing.room
    const topic = String(body.topic ?? existing.topic).trim()
    const notes =
      body.notes !== undefined
        ? typeof body.notes === "string"
          ? body.notes.trim() || null
          : null
        : existing.notes

    if (!teacherId || !dayOfWeek || !startTime || !endTime || !topic) {
      return NextResponse.json(
        { error: "Öğretmen, gün, saat ve konu zorunludur" },
        { status: 400 }
      )
    }
    if (startTime >= endTime) {
      return NextResponse.json({ error: "Bitiş saati başlangıçtan sonra olmalı" }, { status: 400 })
    }

    const teacher = await prisma.staff.findUnique({ where: { id: teacherId } })
    if (!teacher || teacher.department !== "OGRETMEN") {
      return NextResponse.json({ error: "Geçerli bir öğretmen seçiniz" }, { status: 400 })
    }

    const teacherConflict = await assertTeacherFreeForStudySession({
      teacherId,
      dayOfWeek,
      startTime,
      endTime,
      excludeSessionId: sessionId,
    })
    if (teacherConflict) {
      return NextResponse.json({ error: teacherConflict }, { status: 400 })
    }

    const studentIds = existing.studyGroup.students.map((s) => s.studentId)
    const studentConflict = await assertStudentsFreeForStudySession({
      studentIds,
      dayOfWeek,
      startTime,
      endTime,
      excludeSessionId: sessionId,
    })
    if (studentConflict) {
      return NextResponse.json({ error: studentConflict }, { status: 400 })
    }

    const session = await prisma.studyGroupSession.update({
      where: { id: sessionId },
      data: { teacherId, dayOfWeek, startTime, endTime, room, topic, notes },
      include: sessionInclude,
    })

    return NextResponse.json({ success: true, session })
  } catch (error) {
    console.error("Error updating study group session:", error)
    return NextResponse.json({ error: "Atama güncellenemedi" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await context.params
    const existing = await prisma.studyGroupSession.findUnique({ where: { id: sessionId } })
    if (!existing) {
      return NextResponse.json({ error: "Atama bulunamadı" }, { status: 404 })
    }
    await prisma.studyGroupSession.delete({ where: { id: sessionId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting study group session:", error)
    return NextResponse.json({ error: "Atama silinemedi" }, { status: 500 })
  }
}
