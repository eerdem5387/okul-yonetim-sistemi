import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { k12GradeWhereClause } from "@/lib/student-grade-level"

const MAX_CLUBS = 3

function normalizeTc(raw: unknown): string | null {
  const tc = String(raw ?? "").replace(/\D/g, "")
  return tc.length === 11 ? tc : null
}

async function findStudent(tc: string) {
  return prisma.student.findFirst({
    where: { tcNumber: tc, ...k12GradeWhereClause() },
    select: { id: true, firstName: true, lastName: true, grade: true },
  })
}

async function clubPayload(studentId: string) {
  const [clubs, mine] = await Promise.all([
    prisma.club.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        capacity: true,
        _count: { select: { selections: true } },
        selections: { where: { studentId }, select: { id: true } },
      },
    }),
    prisma.clubSelection.findMany({
      where: { studentId },
      select: { clubId: true },
    }),
  ])

  return {
    clubs: clubs.map((club) => ({
      id: club.id,
      name: club.name,
      description: club.description,
      capacity: club.capacity,
      filled: club._count.selections,
      selected: club.selections.length > 0,
    })),
    selectedClubIds: mine.map((row) => row.clubId),
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const tc = normalizeTc(body.tcNumber)
    if (!tc) {
      return NextResponse.json({ error: "11 haneli TC Kimlik numarası girin" }, { status: 400 })
    }

    const student = await findStudent(tc)
    if (!student) {
      return NextResponse.json({ error: "Bu TC ile kayıtlı öğrenci bulunamadı" }, { status: 404 })
    }

    if (!Array.isArray(body.clubIds)) {
      const payload = await clubPayload(student.id)
      return NextResponse.json({
        student: {
          firstName: student.firstName,
          lastName: student.lastName,
          grade: student.grade,
        },
        ...payload,
      })
    }

    const clubIds = [...new Set(body.clubIds.map((id: unknown) => String(id ?? "").trim()).filter(Boolean))]
    if (clubIds.length > MAX_CLUBS) {
      return NextResponse.json({ error: `En fazla ${MAX_CLUBS} kulüp seçilebilir` }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const clubs = await tx.club.findMany({
        where: { id: { in: clubIds } },
        include: { selections: { select: { studentId: true } } },
      })
      if (clubs.length !== clubIds.length) {
        throw new Error("CLUB_NOT_FOUND")
      }

      const fullClubs: string[] = []
      for (const club of clubs) {
        const others = club.selections.filter((sel) => sel.studentId !== student.id).length
        if (others >= club.capacity) fullClubs.push(club.name)
      }
      if (fullClubs.length > 0) {
        throw new Error(`FULL:${fullClubs.join("|")}`)
      }

      await tx.clubSelection.deleteMany({ where: { studentId: student.id } })
      if (clubIds.length > 0) {
        await tx.clubSelection.createMany({
          data: clubIds.map((clubId) => ({ studentId: student.id, clubId })),
          skipDuplicates: true,
        })
      }
      return { saved: clubIds.length }
    })

    const payload = await clubPayload(student.id)
    return NextResponse.json({
      student: {
        firstName: student.firstName,
        lastName: student.lastName,
        grade: student.grade,
      },
      ...payload,
      saved: result.saved,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    if (message.startsWith("FULL:")) {
      return NextResponse.json(
        { error: "Bazı kulüplerin kontenjanı dolu", fullClubs: message.slice(5).split("|") },
        { status: 409 }
      )
    }
    if (message === "CLUB_NOT_FOUND") {
      return NextResponse.json({ error: "Kulüp bulunamadı" }, { status: 400 })
    }
    console.error("Public club selection error:", error)
    return NextResponse.json({ error: "İşlem tamamlanamadı" }, { status: 500 })
  }
}
