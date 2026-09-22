import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { assertEtutSlot } from "@/lib/schedules/club-schedule"
import { DAY_LABELS, hasTimeConflict } from "@/lib/schedules/time-conflict"

export const dynamic = "force-dynamic"

const groupInclude = {
  teacher: {
    select: { id: true, firstName: true, lastName: true, subject: true },
  },
  students: {
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          tcNumber: true,
          grade: true,
        },
      },
    },
  },
}

function parseStudentIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.map((id) => String(id).trim()).filter(Boolean))]
}

async function assertTeacherFree(options: {
  teacherId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  excludeGroupId?: string
}): Promise<string | null> {
  const { teacherId, dayOfWeek, startTime, endTime, excludeGroupId } = options

  const [schedules, groups] = await Promise.all([
    prisma.schedule.findMany({
      where: { teacherId, dayOfWeek, isActive: true },
      include: { class: { select: { name: true } } },
    }),
    prisma.studyGroup.findMany({
      where: {
        teacherId,
        dayOfWeek,
        isActive: true,
        ...(excludeGroupId ? { id: { not: excludeGroupId } } : {}),
      },
    }),
  ])

  const scheduleConflicts = schedules.filter((s) =>
    hasTimeConflict(s.startTime, s.endTime, startTime, endTime)
  )
  if (scheduleConflicts.length > 0) {
    const info = scheduleConflicts
      .map((c) => `${c.class.name} · ${c.subjectName} (${c.startTime}–${c.endTime})`)
      .join(", ")
    return `Öğretmenin aynı saatte sınıf dersi var: ${info}`
  }

  const groupConflicts = groups.filter((g) =>
    hasTimeConflict(g.startTime, g.endTime, startTime, endTime)
  )
  if (groupConflicts.length > 0) {
    const info = groupConflicts
      .map((g) => `${g.name} (${g.startTime}–${g.endTime})`)
      .join(", ")
    return `Öğretmenin aynı saatte başka özel çalışma grubu var: ${info}`
  }

  return null
}

async function assertStudentsFree(options: {
  studentIds: string[]
  dayOfWeek: number
  startTime: string
  endTime: string
  excludeGroupId?: string
}): Promise<string | null> {
  const { studentIds, dayOfWeek, startTime, endTime, excludeGroupId } = options
  if (studentIds.length === 0) return null

  const memberships = await prisma.studyGroupStudent.findMany({
    where: {
      studentId: { in: studentIds },
      studyGroup: {
        dayOfWeek,
        isActive: true,
        ...(excludeGroupId ? { id: { not: excludeGroupId } } : {}),
      },
    },
    include: {
      student: { select: { firstName: true, lastName: true } },
      studyGroup: { select: { name: true, startTime: true, endTime: true } },
    },
  })

  const conflicts = memberships.filter((m) =>
    hasTimeConflict(m.studyGroup.startTime, m.studyGroup.endTime, startTime, endTime)
  )
  if (conflicts.length === 0) return null

  const info = conflicts
    .map(
      (c) =>
        `${c.student.firstName} ${c.student.lastName} → ${c.studyGroup.name} (${c.studyGroup.startTime}–${c.studyGroup.endTime})`
    )
    .join("; ")
  return `Bazı öğrenciler aynı saatte başka grupta: ${info}`
}

/** GET /api/study-groups?teacherId=&dayOfWeek= */
export async function GET(request: NextRequest) {
  try {
    const teacherId = request.nextUrl.searchParams.get("teacherId") || undefined
    const dayOfWeekRaw = request.nextUrl.searchParams.get("dayOfWeek")
    const dayOfWeek = dayOfWeekRaw ? parseInt(dayOfWeekRaw, 10) : undefined

    const groups = await prisma.studyGroup.findMany({
      where: {
        isActive: true,
        ...(teacherId ? { teacherId } : {}),
        ...(dayOfWeek && !Number.isNaN(dayOfWeek) ? { dayOfWeek } : {}),
      },
      include: groupInclude,
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }, { name: "asc" }],
    })

    return NextResponse.json({ groups })
  } catch (error) {
    console.error("Error fetching study groups:", error)
    return NextResponse.json({ error: "Özel çalışma grupları alınamadı" }, { status: 500 })
  }
}

/** POST /api/study-groups */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const name = String(body.name ?? "").trim()
    const subjectName =
      typeof body.subjectName === "string" ? body.subjectName.trim() || null : null
    const teacherId = String(body.teacherId ?? "").trim()
    const dayOfWeek = parseInt(String(body.dayOfWeek ?? ""), 10)
    const startTime = String(body.startTime ?? "").trim()
    const endTime = String(body.endTime ?? "").trim()
    const room = typeof body.room === "string" ? body.room.trim() || null : null
    const notes = typeof body.notes === "string" ? body.notes.trim() || null : null
    const studentIds = parseStudentIds(body.studentIds)

    if (!name || !teacherId || !dayOfWeek || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Grup adı, öğretmen, gün ve saat zorunludur" },
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

    const teacher = await prisma.staff.findUnique({ where: { id: teacherId } })
    if (!teacher || teacher.department !== "OGRETMEN") {
      return NextResponse.json({ error: "Geçerli bir öğretmen seçiniz" }, { status: 400 })
    }

    const foundStudents = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true },
    })
    if (studentIds.length > 0 && foundStudents.length !== studentIds.length) {
      return NextResponse.json({ error: "Bazı öğrenciler bulunamadı" }, { status: 400 })
    }

    const teacherConflict = await assertTeacherFree({
      teacherId,
      dayOfWeek,
      startTime,
      endTime,
    })
    if (teacherConflict) {
      return NextResponse.json({ error: teacherConflict }, { status: 400 })
    }

    const studentConflict =
      studentIds.length > 0
        ? await assertStudentsFree({
            studentIds,
            dayOfWeek,
            startTime,
            endTime,
          })
        : null
    if (studentConflict) {
      return NextResponse.json({ error: studentConflict }, { status: 400 })
    }

    const group = await prisma.studyGroup.create({
      data: {
        name,
        subjectName,
        teacherId,
        dayOfWeek,
        startTime,
        endTime,
        room,
        notes,
        ...(studentIds.length > 0
          ? {
              students: {
                create: studentIds.map((studentId) => ({ studentId })),
              },
            }
          : {}),
      },
      include: groupInclude,
    })

    return NextResponse.json({
      success: true,
      group,
      message: `${DAY_LABELS[dayOfWeek] || "Gün"} ${startTime}–${endTime} özel çalışma grubu oluşturuldu`,
    })
  } catch (error) {
    console.error("Error creating study group:", error)
    return NextResponse.json({ error: "Grup oluşturulamadı" }, { status: 500 })
  }
}
