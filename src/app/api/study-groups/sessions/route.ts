import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { DAY_LABELS } from "@/lib/schedules/time-conflict"
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
      students: {
        select: { studentId: true },
      },
    },
  },
}

/** GET /api/study-groups/sessions?teacherId= — öğretmen atamaları (takvim) */
export async function GET(request: NextRequest) {
  try {
    const teacherId = request.nextUrl.searchParams.get("teacherId") || undefined
    const sessions = await prisma.studyGroupSession.findMany({
      where: {
        isActive: true,
        ...(teacherId ? { teacherId } : {}),
      },
      include: sessionInclude,
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    })
    return NextResponse.json({ sessions })
  } catch (error) {
    console.error("Error fetching study group sessions:", error)
    return NextResponse.json({ error: "Atamalar alınamadı" }, { status: 500 })
  }
}

/** POST /api/study-groups/sessions — { studyGroupId, teacherId, dayOfWeek, startTime, endTime, room?, topic } */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const studyGroupId = String(body.studyGroupId ?? "").trim()
    const teacherId = String(body.teacherId ?? "").trim()
    const dayOfWeek = parseInt(String(body.dayOfWeek ?? ""), 10)
    const startTime = String(body.startTime ?? "").trim()
    const endTime = String(body.endTime ?? "").trim()
    const room = typeof body.room === "string" ? body.room.trim() || null : null
    const topic = String(body.topic ?? "").trim()
    const notes = typeof body.notes === "string" ? body.notes.trim() || null : null

    if (!studyGroupId || !teacherId || !dayOfWeek || !startTime || !endTime || !topic) {
      return NextResponse.json(
        { error: "Grup, öğretmen, gün, saat ve konu zorunludur" },
        { status: 400 }
      )
    }
    if (dayOfWeek < 1 || dayOfWeek > 7) {
      return NextResponse.json({ error: "Geçersiz gün" }, { status: 400 })
    }
    if (startTime >= endTime) {
      return NextResponse.json({ error: "Bitiş saati başlangıçtan sonra olmalı" }, { status: 400 })
    }

    const group = await prisma.studyGroup.findUnique({
      where: { id: studyGroupId },
      include: { students: { select: { studentId: true } } },
    })
    if (!group || !group.isActive) {
      return NextResponse.json({ error: "Grup bulunamadı" }, { status: 404 })
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
    })
    if (teacherConflict) {
      return NextResponse.json({ error: teacherConflict }, { status: 400 })
    }

    const studentIds = group.students.map((s) => s.studentId)
    const studentConflict = await assertStudentsFreeForStudySession({
      studentIds,
      dayOfWeek,
      startTime,
      endTime,
    })
    if (studentConflict) {
      return NextResponse.json({ error: studentConflict }, { status: 400 })
    }

    const session = await prisma.studyGroupSession.create({
      data: {
        studyGroupId,
        teacherId,
        dayOfWeek,
        startTime,
        endTime,
        room,
        topic,
        notes,
      },
      include: sessionInclude,
    })

    return NextResponse.json({
      success: true,
      session,
      message: `${group.name} · ${DAY_LABELS[dayOfWeek] || "Gün"} ${startTime}–${endTime} atandı`,
    })
  } catch (error) {
    console.error("Error creating study group session:", error)
    return NextResponse.json({ error: "Atama oluşturulamadı" }, { status: 500 })
  }
}
