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

/** GET /api/club-groups/[id] */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const group = await prisma.clubGroup.findUnique({
      where: { id },
      include: groupInclude,
    })
    if (!group || !group.isActive) {
      return NextResponse.json({ error: "Grup bulunamadı" }, { status: 404 })
    }
    return NextResponse.json({ group })
  } catch (error) {
    console.error("Error fetching club group:", error)
    return NextResponse.json({ error: "Grup alınamadı" }, { status: 500 })
  }
}

/** PUT /api/club-groups/[id] — { name?, notes?, studentIds? } */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const existing = await prisma.clubGroup.findUnique({
      where: { id },
      select: { id: true, clubId: true, name: true, isActive: true },
    })
    if (!existing || !existing.isActive) {
      return NextResponse.json({ error: "Grup bulunamadı" }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const name =
      body.name !== undefined ? String(body.name ?? "").trim() : existing.name
    const notes =
      body.notes !== undefined
        ? typeof body.notes === "string"
          ? body.notes.trim() || null
          : null
        : undefined
    const studentIds =
      body.studentIds !== undefined ? parseStudentIds(body.studentIds) : null

    if (!name) {
      return NextResponse.json({ error: "Grup adı zorunludur" }, { status: 400 })
    }

    if (name !== existing.name) {
      const clash = await prisma.clubGroup.findFirst({
        where: {
          clubId: existing.clubId,
          name,
          isActive: true,
          id: { not: id },
        },
        select: { id: true },
      })
      if (clash) {
        return NextResponse.json(
          { error: "Bu kulüpte aynı isimde bir grup zaten var" },
          { status: 400 }
        )
      }
    }

    // Soft-delete edilmiş aynı isim @@unique([clubId, name]) yüzünden 500 veriyordu
    const inactiveNameClash =
      name !== existing.name
        ? await prisma.clubGroup.findFirst({
            where: {
              clubId: existing.clubId,
              name,
              isActive: false,
              id: { not: id },
            },
            select: { id: true },
          })
        : null

    if (studentIds) {
      const [club, currentMembers] = await Promise.all([
        prisma.club.findUnique({
          where: { id: existing.clubId },
          select: { selections: { select: { studentId: true } } },
        }),
        // İsim güncellenirken mevcut üyeler seçimde olmasa da kalsın (Excel/sync vb.)
        prisma.clubGroupStudent.findMany({
          where: { clubGroupId: id },
          select: { studentId: true },
        }),
      ])
      const allowed = new Set([
        ...(club?.selections ?? []).map((s) => s.studentId),
        ...currentMembers.map((m) => m.studentId),
      ])
      const invalid = studentIds.filter((sid) => !allowed.has(sid))
      if (invalid.length > 0) {
        return NextResponse.json(
          { error: "Seçilen öğrencilerden bazıları bu kulübe başvurmamış" },
          { status: 400 }
        )
      }
    }

    const group = await prisma.$transaction(async (tx) => {
      if (inactiveNameClash) {
        // Unique slot'u boşalt: eski soft-deleted kaydı arşiv ismine çek
        await tx.clubGroup.update({
          where: { id: inactiveNameClash.id },
          data: {
            name: `${name}__archived_${inactiveNameClash.id.slice(-8)}`,
          },
        })
      }

      if (studentIds) {
        // Aynı kulübün diğer gruplarından çıkar (A/B tek üyelik)
        const siblingGroups = await tx.clubGroup.findMany({
          where: {
            clubId: existing.clubId,
            isActive: true,
            id: { not: id },
          },
          select: { id: true },
        })
        const siblingIds = siblingGroups.map((g) => g.id)
        if (siblingIds.length > 0 && studentIds.length > 0) {
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

        await tx.clubGroupStudent.deleteMany({ where: { clubGroupId: id } })
        if (studentIds.length > 0) {
          await tx.clubGroupStudent.createMany({
            data: studentIds.map((studentId) => ({ clubGroupId: id, studentId })),
            skipDuplicates: true,
          })
        }
        // Gruptan çıkan öğrencilerin bu grubun saat muafiyetlerini temizle
        await tx.clubScheduleExclusion.deleteMany({
          where: {
            clubSchedule: { clubGroupId: id },
            ...(studentIds.length > 0
              ? { studentId: { notIn: studentIds } }
              : {}),
          },
        })
      }
      return tx.clubGroup.update({
        where: { id },
        data: {
          name,
          ...(notes !== undefined ? { notes } : {}),
        },
        include: groupInclude,
      })
    })

    return NextResponse.json({
      success: true,
      group,
      message: "Grup güncellendi",
    })
  } catch (error) {
    console.error("Error updating club group:", error)
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Bu kulüpte aynı isimde bir grup zaten var" },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: "Grup güncellenemedi" }, { status: 500 })
  }
}

/** DELETE /api/club-groups/[id] — soft delete + bağlı programları temizle */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const existing = await prisma.clubGroup.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Grup bulunamadı" }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      // Bağlı etüt programlarını sil (öğretmen takviminde kalmasın)
      await tx.clubSchedule.deleteMany({ where: { clubGroupId: id } })
      await tx.clubGroup.update({
        where: { id },
        data: { isActive: false },
      })
    })

    return NextResponse.json({ success: true, message: "Grup ve program atamaları silindi" })
  } catch (error) {
    console.error("Error deleting club group:", error)
    return NextResponse.json({ error: "Grup silinemedi" }, { status: 500 })
  }
}
