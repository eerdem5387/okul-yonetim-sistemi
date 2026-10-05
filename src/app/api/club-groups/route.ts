import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const groupInclude = {
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
  schedules: {
    where: { isActive: true },
    orderBy: [{ dayOfWeek: "asc" as const }, { startTime: "asc" as const }],
    include: {
      exclusions: {
        select: {
          studentId: true,
          student: { select: { firstName: true, lastName: true } },
        },
      },
    },
  },
}

function parseStudentIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.map((id) => String(id).trim()).filter(Boolean))]
}

/** GET /api/club-groups — kulüp grupları + kulüp listesi (başvuranlar için) */
export async function GET() {
  try {
    const [groups, clubs] = await Promise.all([
      prisma.clubGroup.findMany({
        where: { isActive: true },
        include: groupInclude,
        orderBy: [{ club: { name: "asc" } }, { name: "asc" }],
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
          selections: {
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
            orderBy: { createdAt: "asc" },
          },
        },
      }),
    ])
    return NextResponse.json({ groups, clubs })
  } catch (error) {
    console.error("Error fetching club groups:", error)
    return NextResponse.json({ error: "Kulüp grupları alınamadı" }, { status: 500 })
  }
}

/** POST /api/club-groups — { clubId, name, notes?, studentIds? } */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const clubId = String(body.clubId ?? "").trim()
    const name = String(body.name ?? "").trim()
    const notes = typeof body.notes === "string" ? body.notes.trim() || null : null
    const studentIds = parseStudentIds(body.studentIds)

    if (!clubId) {
      return NextResponse.json({ error: "Kulüp seçiniz" }, { status: 400 })
    }
    if (!name) {
      return NextResponse.json({ error: "Grup adı zorunludur" }, { status: 400 })
    }

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: {
        id: true,
        selections: { select: { studentId: true } },
      },
    })
    if (!club) {
      return NextResponse.json({ error: "Kulüp bulunamadı" }, { status: 404 })
    }

    if (studentIds.length > 0) {
      const allowed = new Set(club.selections.map((s) => s.studentId))
      const invalid = studentIds.filter((id) => !allowed.has(id))
      if (invalid.length > 0) {
        return NextResponse.json(
          { error: "Seçilen öğrencilerden bazıları bu kulübe başvurmamış" },
          { status: 400 }
        )
      }
    }

    const existing = await prisma.clubGroup.findFirst({
      where: { clubId, name, isActive: true },
      select: { id: true },
    })
    if (existing) {
      return NextResponse.json(
        { error: "Bu kulüpte aynı isimde bir grup zaten var" },
        { status: 400 }
      )
    }

    // Soft-delete edilmiş aynı isimli grup varsa yeniden aktifleştir
    const inactive = await prisma.clubGroup.findFirst({
      where: { clubId, name, isActive: false },
      select: { id: true },
    })

    let group
    if (inactive) {
      group = await prisma.$transaction(async (tx) => {
        await tx.clubSchedule.deleteMany({ where: { clubGroupId: inactive.id } })
        await tx.clubGroupStudent.deleteMany({ where: { clubGroupId: inactive.id } })
        if (studentIds.length > 0) {
          const siblings = await tx.clubGroup.findMany({
            where: { clubId, isActive: true, id: { not: inactive.id } },
            select: { id: true },
          })
          const siblingIds = siblings.map((g) => g.id)
          if (siblingIds.length > 0) {
            await tx.clubGroupStudent.deleteMany({
              where: {
                clubGroupId: { in: siblingIds },
                studentId: { in: studentIds },
              },
            })
            await tx.clubScheduleExclusion.deleteMany({
              where: {
                studentId: { in: studentIds },
                clubSchedule: { clubGroupId: { in: siblingIds } },
              },
            })
          }
          await tx.clubGroupStudent.createMany({
            data: studentIds.map((studentId) => ({
              clubGroupId: inactive.id,
              studentId,
            })),
            skipDuplicates: true,
          })
        }
        return tx.clubGroup.update({
          where: { id: inactive.id },
          data: { isActive: true, notes },
          include: groupInclude,
        })
      })
    } else {
      group = await prisma.$transaction(async (tx) => {
        if (studentIds.length > 0) {
          const siblings = await tx.clubGroup.findMany({
            where: { clubId, isActive: true },
            select: { id: true },
          })
          const siblingIds = siblings.map((g) => g.id)
          if (siblingIds.length > 0) {
            await tx.clubGroupStudent.deleteMany({
              where: {
                clubGroupId: { in: siblingIds },
                studentId: { in: studentIds },
              },
            })
            await tx.clubScheduleExclusion.deleteMany({
              where: {
                studentId: { in: studentIds },
                clubSchedule: { clubGroupId: { in: siblingIds } },
              },
            })
          }
        }
        return tx.clubGroup.create({
          data: {
            clubId,
            name,
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
      })
    }

    return NextResponse.json({
      success: true,
      group,
      message: `"${name}" grubu oluşturuldu`,
    })
  } catch (error) {
    console.error("Error creating club group:", error)
    return NextResponse.json({ error: "Grup oluşturulamadı" }, { status: 500 })
  }
}
