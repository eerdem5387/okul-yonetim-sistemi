import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma, type AttendanceKind, type AttendanceStatus } from "@prisma/client"
import { isSuperAdmin, resolveActorWithPermission } from "@/lib/permissions"

export const dynamic = "force-dynamic"

const attendanceInclude = {
  class: {
    select: { id: true, name: true, grade: true, section: true },
  },
  teacher: {
    select: { id: true, firstName: true, lastName: true, subject: true },
  },
  student: {
    select: { id: true, firstName: true, lastName: true, grade: true },
  },
  schedule: {
    select: { id: true, subjectName: true, dayOfWeek: true },
  },
  studyGroupSession: {
    select: {
      id: true,
      topic: true,
      dayOfWeek: true,
      studyGroup: { select: { id: true, name: true, gradeLevel: true } },
    },
  },
  clubSchedule: {
    select: {
      id: true,
      dayOfWeek: true,
      club: { select: { id: true, name: true } },
    },
  },
} as const

function dayBounds(dateStr: string) {
  const start = new Date(`${dateStr}T00:00:00.000`)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start, end }
}

function scopeToOwnRecords(actor: {
  staffId: string
  department: string
  isTeacher: boolean
}): boolean {
  if (isSuperAdmin(actor.department as never, actor.staffId)) return false
  return actor.isTeacher || actor.department === "OGRETMEN"
}

/** GET /api/attendance */
export async function GET(request: NextRequest) {
  try {
    const actor = await resolveActorWithPermission(request, "attendance", "view")
    if (!actor) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const teacherId = searchParams.get("teacherId")
    const classId = searchParams.get("classId")
    const studentId = searchParams.get("studentId")
    const date = searchParams.get("date")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const status = searchParams.get("status")
    const kind = searchParams.get("kind") as AttendanceKind | null
    const scheduleId = searchParams.get("scheduleId")
    const studyGroupSessionId = searchParams.get("studyGroupSessionId")
    const clubScheduleId = searchParams.get("clubScheduleId")

    const where: Prisma.AttendanceWhereInput = {}

    if (scopeToOwnRecords(actor)) {
      where.teacherId = actor.staffId
      if (teacherId && teacherId !== actor.staffId) {
        return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
      }
    } else if (teacherId) {
      where.teacherId = teacherId
    }

    if (classId) where.classId = classId
    if (studentId) where.studentId = studentId
    if (status) where.status = status as AttendanceStatus
    if (kind) where.kind = kind
    if (scheduleId) where.scheduleId = scheduleId
    if (studyGroupSessionId) where.studyGroupSessionId = studyGroupSessionId
    if (clubScheduleId) where.clubScheduleId = clubScheduleId

    if (date) {
      const { start, end } = dayBounds(date)
      where.date = { gte: start, lt: end }
    } else if (dateFrom || dateTo) {
      where.date = {}
      if (dateFrom) where.date.gte = new Date(`${dateFrom}T00:00:00.000`)
      if (dateTo) {
        const end = new Date(`${dateTo}T00:00:00.000`)
        end.setDate(end.getDate() + 1)
        where.date.lt = end
      }
    }

    const attendances = await prisma.attendance.findMany({
      where,
      include: attendanceInclude,
      orderBy: [{ date: "desc" }, { startTime: "asc" }],
      take: 2000,
    })

    return NextResponse.json({ attendances })
  } catch (error) {
    console.error("Error fetching attendances:", error)
    return NextResponse.json({ error: "Yoklamalar alınırken bir hata oluştu" }, { status: 500 })
  }
}

/** POST /api/attendance — toplu yoklama (CLASS | STUDY_GROUP | CLUB) */
export async function POST(request: NextRequest) {
  try {
    const actor = await resolveActorWithPermission(request, "attendance", "create")
    if (!actor) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const kind = (String(body.kind || "CLASS").toUpperCase() || "CLASS") as AttendanceKind
    const teacherId = String(body.teacherId || actor.staffId).trim()
    const dateStr = String(body.date || "").trim()
    const lessonName = String(body.lessonName || "Ders").trim() || "Ders"
    const startTime = String(body.startTime || "09:00").trim()
    const endTime = String(body.endTime || "10:00").trim()
    const scheduleId = body.scheduleId ? String(body.scheduleId) : null
    const classId = body.classId ? String(body.classId) : null
    const studyGroupSessionId = body.studyGroupSessionId
      ? String(body.studyGroupSessionId)
      : null
    const clubScheduleId = body.clubScheduleId ? String(body.clubScheduleId) : null
    const rows = Array.isArray(body.attendances)
      ? body.attendances.filter(
          (a: { studentId?: string; status?: string }) => a?.studentId && a?.status
        )
      : []

    if (!dateStr) {
      return NextResponse.json({ error: "Tarih zorunludur" }, { status: 400 })
    }
    if (rows.length === 0) {
      return NextResponse.json(
        { error: "En az bir öğrenci yoklama durumu gereklidir" },
        { status: 400 }
      )
    }

    if (scopeToOwnRecords(actor) && teacherId !== actor.staffId) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
    }

    if (kind === "CLASS" && !classId) {
      return NextResponse.json({ error: "Sınıf dersi için classId zorunludur" }, { status: 400 })
    }
    if (kind === "STUDY_GROUP" && !studyGroupSessionId) {
      return NextResponse.json(
        { error: "ÖÇG için studyGroupSessionId zorunludur" },
        { status: 400 }
      )
    }
    if (kind === "CLUB" && !clubScheduleId) {
      return NextResponse.json({ error: "Kulüp için clubScheduleId zorunludur" }, { status: 400 })
    }

    if (kind === "STUDY_GROUP" && studyGroupSessionId) {
      const sess = await prisma.studyGroupSession.findUnique({
        where: { id: studyGroupSessionId },
        select: { teacherId: true },
      })
      if (!sess) return NextResponse.json({ error: "ÖÇG ataması bulunamadı" }, { status: 404 })
      if (scopeToOwnRecords(actor) && sess.teacherId !== actor.staffId) {
        return NextResponse.json({ error: "Bu ÖÇG size atanmamış" }, { status: 403 })
      }
    }
    if (kind === "CLUB" && clubScheduleId) {
      const cs = await prisma.clubSchedule.findUnique({
        where: { id: clubScheduleId },
        include: { club: { select: { instructorId: true } } },
      })
      if (!cs) return NextResponse.json({ error: "Kulüp programı bulunamadı" }, { status: 404 })
      if (scopeToOwnRecords(actor) && cs.club.instructorId !== actor.staffId) {
        return NextResponse.json({ error: "Bu kulüp size atanmamış" }, { status: 403 })
      }
    }
    if (kind === "CLASS" && scheduleId) {
      const sch = await prisma.schedule.findUnique({
        where: { id: scheduleId },
        select: { teacherId: true },
      })
      if (sch && scopeToOwnRecords(actor) && sch.teacherId !== actor.staffId) {
        return NextResponse.json({ error: "Bu ders size ait değil" }, { status: 403 })
      }
    }

    const { start, end } = dayBounds(dateStr)
    const deleteWhere: Prisma.AttendanceWhereInput = {
      date: { gte: start, lt: end },
      kind,
      teacherId,
    }
    if (kind === "CLASS") {
      if (scheduleId) deleteWhere.scheduleId = scheduleId
      else {
        deleteWhere.classId = classId
        deleteWhere.startTime = startTime
        deleteWhere.lessonName = lessonName
      }
    } else if (kind === "STUDY_GROUP") {
      deleteWhere.studyGroupSessionId = studyGroupSessionId
    } else if (kind === "CLUB") {
      deleteWhere.clubScheduleId = clubScheduleId
    }

    await prisma.$transaction(async (tx) => {
      await tx.attendance.deleteMany({ where: deleteWhere })
      await tx.attendance.createMany({
        data: rows.map((att: { studentId: string; status: string; note?: string }) => ({
          kind,
          scheduleId: kind === "CLASS" ? scheduleId : null,
          studyGroupSessionId: kind === "STUDY_GROUP" ? studyGroupSessionId : null,
          clubScheduleId: kind === "CLUB" ? clubScheduleId : null,
          classId: kind === "CLASS" ? classId : null,
          teacherId,
          date: start,
          lessonName,
          startTime,
          endTime,
          studentId: att.studentId,
          status: att.status as AttendanceStatus,
          note: att.note || null,
        })),
      })
    })

    return NextResponse.json({
      success: true,
      count: rows.length,
      message: `${rows.length} öğrenci için yoklama kaydedildi`,
    })
  } catch (error) {
    console.error("Error creating attendances:", error)
    return NextResponse.json({ error: "Yoklama kaydedilirken bir hata oluştu" }, { status: 500 })
  }
}
