import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { clubMatchesStudentGrade } from "@/lib/club-grade-levels"
import { k12GradeWhereClause } from "@/lib/student-grade-level"

export const dynamic = "force-dynamic"

function normalizeTc(raw: unknown): string | null {
  const tc = String(raw ?? "").replace(/\D/g, "")
  return tc.length === 11 ? tc : null
}

async function resolveStudentId(body: Record<string, unknown>): Promise<
  { studentId: string } | { error: string; status: number }
> {
  const studentId = String(body.studentId ?? "").trim()
  if (studentId) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, grade: true },
    })
    if (!student) return { error: "Öğrenci bulunamadı", status: 404 }
    return { studentId: student.id }
  }

  const tc = normalizeTc(body.tcNumber)
  if (!tc) return { error: "Öğrenci veya TC gerekli", status: 400 }

  const student = await prisma.student.findFirst({
    where: { tcNumber: tc, ...k12GradeWhereClause() },
    select: { id: true },
  })
  if (!student) return { error: "Bu TC ile öğrenci bulunamadı", status: 404 }
  return { studentId: student.id }
}

/** POST /api/clubs/demands — { clubId, studentId? } veya { clubId, tcNumber } */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const clubId = String(body.clubId ?? "").trim()
    if (!clubId) {
      return NextResponse.json({ error: "Kulüp gerekli" }, { status: 400 })
    }

    const resolved = await resolveStudentId(body)
    if ("error" in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status })
    }
    const { studentId } = resolved

    const [club, student, existingSelection, existingDemand] = await Promise.all([
      prisma.club.findUnique({
        where: { id: clubId },
        include: { _count: { select: { selections: true } } },
      }),
      prisma.student.findUnique({
        where: { id: studentId },
        select: { id: true, firstName: true, lastName: true, grade: true },
      }),
      prisma.clubSelection.findUnique({
        where: { studentId_clubId: { studentId, clubId } },
      }),
      prisma.clubDemandRequest.findUnique({
        where: { clubId_studentId: { clubId, studentId } },
      }),
    ])

    if (!club || !student) {
      return NextResponse.json({ error: "Kulüp veya öğrenci bulunamadı" }, { status: 404 })
    }
    if (!clubMatchesStudentGrade(club.gradeLevels, student.grade)) {
      return NextResponse.json({ error: "Bu kulüp öğrencinin sınıfına açık değil" }, { status: 400 })
    }
    if (existingSelection) {
      return NextResponse.json({ error: "Öğrenci zaten bu kulüpte kayıtlı" }, { status: 400 })
    }
    if (club._count.selections < club.capacity) {
      return NextResponse.json(
        { error: "Kulüpte kontenjan var; doğrudan seçim yapabilirsiniz" },
        { status: 400 }
      )
    }
    if (existingDemand) {
      return NextResponse.json({
        success: true,
        alreadyExists: true,
        message: "Talebiniz zaten kayıtlı",
        demand: existingDemand,
      })
    }

    const note =
      typeof body.note === "string" ? body.note.trim().slice(0, 500) || null : null

    const demand = await prisma.clubDemandRequest.create({
      data: { clubId, studentId, note },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, grade: true },
        },
        club: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({
      success: true,
      message: "Talebiniz alındı",
      demand,
    })
  } catch (error) {
    console.error("Error creating club demand:", error)
    return NextResponse.json({ error: "Talep oluşturulamadı" }, { status: 500 })
  }
}
