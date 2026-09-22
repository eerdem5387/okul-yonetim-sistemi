import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { assertEtutSlot } from "@/lib/schedules/club-schedule"
import { hasTimeConflict } from "@/lib/schedules/time-conflict"

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
  excludeGroupId: string
}): Promise<string | null> {
  const { teacherId, dayOfWeek, startTime, endTime, excludeGroupId } = options

  const [schedules, groups] = await Promise.all([
    prisma.schedule.findMany({
      where: { teacherId, dayOfWeek, isActive: true },
      include: { class: { select: { name: true } } },
    }),
    prisma.studyGroup.findMany({
      where: { teacherId, dayOfWeek, isActive: true, id: { not: excludeGroupId } },
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
    const info = groupConflicts.map((g) => `${g.name} (${g.startTime}–${g.endTime})`).join(", ")
    return `Öğretmenin aynı saatte başka özel çalışma grubu var: ${info}`
  }

  return null
}

async function assertStudentsFree(options: {
  studentIds: string[]
  dayOfWeek: number
  startTime: string
  endTime: string
  excludeGroupId: string
}): Promise<string | null> {
  const { studentIds, dayOfWeek, startTime, endTime, excludeGroupId } = options
  if (studentIds.length === 0) return null

  const memberships = await prisma.studyGroupStudent.findMany({
    where: {
      studentId: { in: studentIds },
      studyGroup: {
        dayOfWeek,
        isActive: true,
        id: { not: excludeGroupId },
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

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const group = await prisma.studyGroup.findUnique({
      where: { id },
      include: groupInclude,
    })
    if (!group) {
      return NextResponse.json({ error: "Grup bulunamadı" }, { status: 404 })
    }
    return NextResponse.json({ group })
  } catch (error) {
    console.error("Error fetching study group:", error)
    return NextResponse.json({ error: "Grup alınamadı" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const existing = await prisma.studyGroup.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Grup bulunamadı" }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const name = String(body.name ?? existing.name).trim()
    const subjectName =
      body.subjectName !== undefined
        ? typeof body.subjectName === "string"
          ? body.subjectName.trim() || null
          : null
        : existing.subjectName
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
    const notes =
      body.notes !== undefined
        ? typeof body.notes === "string"
          ? body.notes.trim() || null
          : null
        : existing.notes
    const studentIds: string[] | null = Array.isArray(body.studentIds)
      ? parseStudentIds(body.studentIds)
      : null

    if (!name || !teacherId || !dayOfWeek || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Grup adı, öğretmen, gün ve saat zorunludur" },
        { status: 400 }
      )
    }

    const etutErr = await assertEtutSlot(startTime, endTime)
    if (etutErr) {
      return NextResponse.json({ error: etutErr }, { status: 400 })
    }

    const teacher = await prisma.staff.findUnique({ where: { id: teacherId } })
    if (!teacher || teacher.department !== "OGRETMEN") {
      return NextResponse.json({ error: "Geçerli bir öğretmen seçiniz" }, { status: 400 })
    }

    const finalStudentIds =
      studentIds ??
      (
        await prisma.studyGroupStudent.findMany({
          where: { studyGroupId: id },
          select: { studentId: true },
        })
      ).map((r) => r.studentId)

    if (studentIds) {
      const found = await prisma.student.findMany({
        where: { id: { in: studentIds } },
        select: { id: true },
      })
      if (studentIds.length > 0 && found.length !== studentIds.length) {
        return NextResponse.json({ error: "Bazı öğrenciler bulunamadı" }, { status: 400 })
      }
    }

    const teacherConflict = await assertTeacherFree({
      teacherId,
      dayOfWeek,
      startTime,
      endTime,
      excludeGroupId: id,
    })
    if (teacherConflict) {
      return NextResponse.json({ error: teacherConflict }, { status: 400 })
    }

    const studentConflict =
      finalStudentIds.length > 0
        ? await assertStudentsFree({
            studentIds: finalStudentIds,
            dayOfWeek,
            startTime,
            endTime,
            excludeGroupId: id,
          })
        : null
    if (studentConflict) {
      return NextResponse.json({ error: studentConflict }, { status: 400 })
    }

    const group = await prisma.$transaction(async (tx) => {
      if (studentIds) {
        await tx.studyGroupStudent.deleteMany({ where: { studyGroupId: id } })
        if (studentIds.length > 0) {
          await tx.studyGroupStudent.createMany({
            data: studentIds.map((studentId) => ({ studyGroupId: id, studentId })),
          })
        }
      }
      return tx.studyGroup.update({
        where: { id },
        data: {
          name,
          subjectName,
          teacherId,
          dayOfWeek,
          startTime,
          endTime,
          room,
          notes,
        },
        include: groupInclude,
      })
    })

    return NextResponse.json({ success: true, group })
  } catch (error) {
    console.error("Error updating study group:", error)
    return NextResponse.json({ error: "Grup güncellenemedi" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const existing = await prisma.studyGroup.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Grup bulunamadı" }, { status: 404 })
    }
    await prisma.studyGroup.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting study group:", error)
    return NextResponse.json({ error: "Grup silinemedi" }, { status: 500 })
  }
}
