import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { assertStudentsWithoutClubSelection } from "@/lib/schedules/club-selection-guard"

export const dynamic = "force-dynamic"

const groupInclude = {
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
  sessions: {
    where: { isActive: true },
    include: {
      teacher: {
        select: { id: true, firstName: true, lastName: true, subject: true },
      },
    },
    orderBy: [{ dayOfWeek: "asc" as const }, { startTime: "asc" as const }],
  },
}

function parseStudentIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.map((id) => String(id).trim()).filter(Boolean))]
}

function parseBand(raw: unknown): "ORTAOKUL" | "LISE" | null {
  const v = String(raw ?? "")
    .trim()
    .toUpperCase()
  if (v === "ORTAOKUL" || v === "LISE") return v
  if (v === "ORTA" || v === "MIDDLE") return "ORTAOKUL"
  if (v === "HIGH") return "LISE"
  return null
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

/** PUT — grup adı / notlar / öğrenci listesi */
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
    const band =
      body.band !== undefined ? parseBand(body.band) : (existing.band as "ORTAOKUL" | "LISE")
    const notes =
      body.notes !== undefined
        ? typeof body.notes === "string"
          ? body.notes.trim() || null
          : null
        : existing.notes
    const studentIds: string[] | null = Array.isArray(body.studentIds)
      ? parseStudentIds(body.studentIds)
      : null

    if (!name) {
      return NextResponse.json({ error: "Grup adı zorunludur" }, { status: 400 })
    }
    if (!band) {
      return NextResponse.json({ error: "Kademe seçiniz (ortaokul / lise)" }, { status: 400 })
    }

    if (studentIds) {
      const found = await prisma.student.findMany({
        where: { id: { in: studentIds } },
        select: { id: true },
      })
      if (studentIds.length > 0 && found.length !== studentIds.length) {
        return NextResponse.json({ error: "Bazı öğrenciler bulunamadı" }, { status: 400 })
      }
      if (studentIds.length > 0) {
        const clubBlock = await assertStudentsWithoutClubSelection(studentIds)
        if (clubBlock) {
          return NextResponse.json({ error: clubBlock }, { status: 400 })
        }
      }
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
        data: { name, band, notes },
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
