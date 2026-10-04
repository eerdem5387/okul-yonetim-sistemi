import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  assertClubSlotFree,
  assertEtutSlot,
  DAY_LABELS,
  loadEtutSlots,
} from "@/lib/schedules/club-schedule"
import {
  assertNoGradeEtutExamConflict,
  listGradeEtutExams,
} from "@/lib/schedules/grade-etut-exams"
import { isStaffEligibleAsScheduleInstructor } from "@/lib/staff-counseling"

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
  clubGroup: {
    select: {
      id: true,
      name: true,
      _count: { select: { students: true } },
      students: {
        include: {
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
  exclusions: {
    select: { studentId: true },
  },
} as const

/** GET /api/schedules/clubs — kulüp programları + etüt slotları + kulüp/grup listesi */
export async function GET() {
  try {
    const [schedules, clubs, groups, etutSlots, gradeEtutExams] = await Promise.all([
      prisma.clubSchedule.findMany({
        where: {
          isActive: true,
          OR: [{ clubGroupId: null }, { clubGroup: { isActive: true } }],
        },
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
      prisma.clubGroup.findMany({
        where: { isActive: true },
        orderBy: [{ club: { name: "asc" } }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          clubId: true,
          club: {
            select: {
              id: true,
              name: true,
              capacity: true,
              instructorId: true,
              instructor: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  subject: true,
                },
              },
            },
          },
          _count: { select: { students: true, schedules: true } },
        },
      }),
      loadEtutSlots(),
      listGradeEtutExams(),
    ])

    return NextResponse.json({ schedules, clubs, groups, etutSlots, gradeEtutExams })
  } catch (error) {
    console.error("Error fetching club schedules:", error)
    return NextResponse.json({ error: "Kulüp programları alınamadı" }, { status: 500 })
  }
}

/** POST /api/schedules/clubs — { clubGroupId? | clubId, dayOfWeek, startTime, endTime, room?, notes?, instructorId? } */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    let clubId = String(body.clubId ?? "").trim()
    const clubGroupId = body.clubGroupId ? String(body.clubGroupId).trim() : null
    const dayOfWeek = parseInt(String(body.dayOfWeek ?? ""), 10)
    const startTime = String(body.startTime ?? "").trim()
    const endTime = String(body.endTime ?? "").trim()
    const room = typeof body.room === "string" ? body.room.trim() || null : null
    const notes = typeof body.notes === "string" ? body.notes.trim() || null : null
    const hasInstructor = Object.prototype.hasOwnProperty.call(body, "instructorId")
    const instructorId = hasInstructor
      ? body.instructorId
        ? String(body.instructorId).trim()
        : null
      : undefined

    if (clubGroupId) {
      const group = await prisma.clubGroup.findUnique({
        where: { id: clubGroupId },
        select: { id: true, clubId: true, isActive: true },
      })
      if (!group || !group.isActive) {
        return NextResponse.json({ error: "Kulüp grubu bulunamadı" }, { status: 404 })
      }
      clubId = group.clubId
    }

    if (!clubId || !dayOfWeek || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Kulüp/grup, gün ve etüt saati zorunludur" },
        { status: 400 }
      )
    }
    if (dayOfWeek < 1 || dayOfWeek > 7) {
      return NextResponse.json({ error: "Geçersiz gün" }, { status: 400 })
    }

    if (instructorId) {
      const teacher = await prisma.staff.findUnique({ where: { id: instructorId } })
      if (!teacher || !isStaffEligibleAsScheduleInstructor(teacher.department)) {
        return NextResponse.json(
          { error: "Geçerli bir öğretmen veya rehberlik personeli seçiniz" },
          { status: 400 }
        )
      }
    }

    const etutErr = await assertEtutSlot(startTime, endTime)
    if (etutErr) {
      return NextResponse.json({ error: etutErr }, { status: 400 })
    }

    const clubMeta = await prisma.club.findUnique({
      where: { id: clubId },
      select: { gradeLevels: true },
    })
    const denemeErr = await assertNoGradeEtutExamConflict({
      gradeLevels: clubMeta?.gradeLevels ?? [],
      dayOfWeek,
      startTime,
      endTime,
    })
    if (denemeErr) {
      return NextResponse.json({ error: denemeErr }, { status: 400 })
    }

    const freeErr = await assertClubSlotFree({
      clubId,
      clubGroupId,
      dayOfWeek,
      startTime,
      endTime,
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
      return tx.clubSchedule.create({
        data: { clubId, clubGroupId, dayOfWeek, startTime, endTime, room, notes },
        include: scheduleInclude,
      })
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
