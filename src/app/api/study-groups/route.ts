import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { normalizeClubGradeLevels } from "@/lib/club-grade-levels"

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

/** gradeLevels[] veya eski tekil gradeLevel */
function parseGradeLevels(body: Record<string, unknown>): number[] {
  if (body.gradeLevels !== undefined) {
    return normalizeClubGradeLevels(body.gradeLevels)
  }
  if (body.gradeLevel !== undefined) {
    return normalizeClubGradeLevels([body.gradeLevel])
  }
  return []
}

/** GET /api/study-groups — grup listesi (öğrenci + atamalar) */
export async function GET() {
  try {
    const groups = await prisma.studyGroup.findMany({
      where: { isActive: true },
      include: groupInclude,
      orderBy: [{ name: "asc" }],
    })
    return NextResponse.json({ groups })
  } catch (error) {
    console.error("Error fetching study groups:", error)
    return NextResponse.json({ error: "Özel çalışma grupları alınamadı" }, { status: 500 })
  }
}

/** POST /api/study-groups — isim + sınıf düzeyleri + öğrenciler */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const name = String(body.name ?? "").trim()
    const gradeLevels = parseGradeLevels(body)
    const notes = typeof body.notes === "string" ? body.notes.trim() || null : null
    const studentIds = parseStudentIds(body.studentIds)

    if (!name) {
      return NextResponse.json({ error: "Grup adı zorunludur" }, { status: 400 })
    }

    if (studentIds.length > 0) {
      const found = await prisma.student.findMany({
        where: { id: { in: studentIds } },
        select: { id: true },
      })
      if (found.length !== studentIds.length) {
        return NextResponse.json({ error: "Bazı öğrenciler bulunamadı" }, { status: 400 })
      }
    }

    const group = await prisma.studyGroup.create({
      data: {
        name,
        gradeLevels,
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
      message: `"${name}" grubu oluşturuldu`,
    })
  } catch (error) {
    console.error("Error creating study group:", error)
    return NextResponse.json({ error: "Grup oluşturulamadı" }, { status: 500 })
  }
}
