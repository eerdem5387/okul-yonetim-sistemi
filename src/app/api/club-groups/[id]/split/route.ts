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

/**
 * POST /api/club-groups/[id]/split
 * Grubu ikiye böler: seçilen öğrenciler yeni gruba taşınır.
 * { newName, moveStudentIds, renameSourceTo?, copyScheduleIds? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sourceId } = await params
    const body = await request.json().catch(() => ({}))
    const newName = String(body.newName ?? "").trim()
    const renameSourceTo =
      body.renameSourceTo !== undefined
        ? String(body.renameSourceTo ?? "").trim() || null
        : null
    const moveStudentIds = parseStudentIds(body.moveStudentIds)
    const copyScheduleIds = parseStudentIds(body.copyScheduleIds)

    if (!newName) {
      return NextResponse.json({ error: "Yeni grup adı zorunludur" }, { status: 400 })
    }
    if (moveStudentIds.length === 0) {
      return NextResponse.json(
        { error: "Yeni gruba taşınacak en az bir öğrenci seçiniz" },
        { status: 400 }
      )
    }

    const source = await prisma.clubGroup.findUnique({
      where: { id: sourceId },
      select: {
        id: true,
        name: true,
        clubId: true,
        notes: true,
        isActive: true,
        students: { select: { studentId: true } },
        schedules: {
          where: { isActive: true },
          select: {
            id: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            room: true,
            notes: true,
          },
        },
      },
    })

    if (!source || !source.isActive) {
      return NextResponse.json({ error: "Grup bulunamadı" }, { status: 404 })
    }

    const sourceMemberIds = new Set(source.students.map((s) => s.studentId))
    const invalid = moveStudentIds.filter((sid) => !sourceMemberIds.has(sid))
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: "Seçilen öğrencilerden bazıları bu grupta değil" },
        { status: 400 }
      )
    }

    if (moveStudentIds.length >= sourceMemberIds.size) {
      return NextResponse.json(
        {
          error:
            "Tüm öğrencileri taşıyamazsınız. En az bir öğrenci mevcut grupta kalmalı.",
        },
        { status: 400 }
      )
    }

    const finalSourceName = renameSourceTo || source.name
    if (finalSourceName === newName) {
      return NextResponse.json(
        { error: "Kaynak ve yeni grup adları farklı olmalı" },
        { status: 400 }
      )
    }

    // İsim çakışmaları
    const nameClash = await prisma.clubGroup.findFirst({
      where: {
        clubId: source.clubId,
        isActive: true,
        name: { in: [newName, finalSourceName] },
        id: { not: sourceId },
      },
      select: { id: true, name: true },
    })
    if (nameClash) {
      return NextResponse.json(
        { error: `Bu kulüpte “${nameClash.name}” adında grup zaten var` },
        { status: 400 }
      )
    }

    // Soft-deleted aynı isim varsa engelle / temizle senaryosu
    const inactiveSame = await prisma.clubGroup.findFirst({
      where: { clubId: source.clubId, name: newName, isActive: false },
      select: { id: true },
    })

    const schedulesToCopy = source.schedules.filter((s) =>
      copyScheduleIds.includes(s.id)
    )

    const result = await prisma.$transaction(async (tx) => {
      let newGroupId: string

      if (inactiveSame) {
        await tx.clubSchedule.deleteMany({ where: { clubGroupId: inactiveSame.id } })
        await tx.clubGroupStudent.deleteMany({
          where: { clubGroupId: inactiveSame.id },
        })
        await tx.clubGroup.update({
          where: { id: inactiveSame.id },
          data: {
            isActive: true,
            notes: source.notes
              ? `${source.notes} · ${source.name} grubundan bölündü`
              : `${source.name} grubundan bölündü`,
          },
        })
        newGroupId = inactiveSame.id
      } else {
        const created = await tx.clubGroup.create({
          data: {
            clubId: source.clubId,
            name: newName,
            notes: source.notes
              ? `${source.notes} · ${source.name} grubundan bölündü`
              : `${source.name} grubundan bölündü`,
          },
          select: { id: true },
        })
        newGroupId = created.id
      }

      // Öğrencileri taşı
      await tx.clubGroupStudent.deleteMany({
        where: {
          clubGroupId: sourceId,
          studentId: { in: moveStudentIds },
        },
      })
      await tx.clubGroupStudent.createMany({
        data: moveStudentIds.map((studentId) => ({
          clubGroupId: newGroupId,
          studentId,
        })),
        skipDuplicates: true,
      })

      // Taşınan öğrencilerin eski grup saat muafiyetlerini temizle
      await tx.clubScheduleExclusion.deleteMany({
        where: {
          studentId: { in: moveStudentIds },
          clubSchedule: { clubGroupId: sourceId },
        },
      })

      // Kaynak grubu yeniden adlandır (opsiyonel)
      if (renameSourceTo && renameSourceTo !== source.name) {
        await tx.clubGroup.update({
          where: { id: sourceId },
          data: { name: renameSourceTo },
        })
      } else if (inactiveSame && newName) {
        // new group already has name from inactive - ensure name set
        await tx.clubGroup.update({
          where: { id: newGroupId },
          data: { name: newName },
        })
      } else if (!inactiveSame) {
        // already created with newName
      } else {
        await tx.clubGroup.update({
          where: { id: newGroupId },
          data: { name: newName },
        })
      }

      // İstenirse seçili programları yeni gruba kopyala
      for (const sch of schedulesToCopy) {
        await tx.clubSchedule.create({
          data: {
            clubId: source.clubId,
            clubGroupId: newGroupId,
            dayOfWeek: sch.dayOfWeek,
            startTime: sch.startTime,
            endTime: sch.endTime,
            room: sch.room,
            notes: sch.notes,
            isActive: true,
          },
        })
      }

      const [sourceGroup, newGroup] = await Promise.all([
        tx.clubGroup.findUniqueOrThrow({
          where: { id: sourceId },
          include: groupInclude,
        }),
        tx.clubGroup.findUniqueOrThrow({
          where: { id: newGroupId },
          include: groupInclude,
        }),
      ])

      return { sourceGroup, newGroup }
    })

    return NextResponse.json({
      success: true,
      sourceGroup: result.sourceGroup,
      newGroup: result.newGroup,
      message: `"${result.sourceGroup.name}" ve "${result.newGroup.name}" olarak bölündü. Yeni gruba Program ata ile gün seçebilirsiniz.`,
    })
  } catch (error) {
    console.error("[club-groups split]", error)
    const message =
      error && typeof error === "object" && "code" in error && error.code === "P2002"
        ? "Bu kulüpte aynı isimde grup zaten var"
        : "Grup bölünemedi"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
