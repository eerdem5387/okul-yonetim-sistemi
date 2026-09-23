import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { clubMatchesStudentGrade } from "@/lib/club-grade-levels"
import { k12GradeWhereClause } from "@/lib/student-grade-level"
import {
  isOverClubSelectionQuota,
  MAX_CLUB_SELECTIONS,
} from "@/lib/clubs/selection-quota"

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

async function clubPayload(studentId: string, studentGrade: string) {
  const [clubs, mine, myDemands] = await Promise.all([
    prisma.club.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        capacity: true,
        gradeLevels: true,
        exemptFromSelectionLimit: true,
        _count: { select: { selections: true } },
        selections: { where: { studentId }, select: { id: true } },
      },
    }),
    prisma.clubSelection.findMany({
      where: { studentId },
      select: { clubId: true },
    }),
    prisma.clubDemandRequest.findMany({
      where: { studentId },
      select: { clubId: true },
    }),
  ])

  const visible = clubs.filter((club) => clubMatchesStudentGrade(club.gradeLevels, studentGrade))
  const visibleIds = new Set(visible.map((club) => club.id))
  const demandedIds = new Set(myDemands.map((d) => d.clubId))
  const selectedClubIds = mine.map((row) => row.clubId).filter((id) => visibleIds.has(id))

  return {
    clubs: visible.map((club) => ({
      id: club.id,
      name: club.name,
      description: club.description,
      capacity: club.capacity,
      filled: club._count.selections,
      selected: club.selections.length > 0,
      demanded: demandedIds.has(club.id),
      exemptFromSelectionLimit: club.exemptFromSelectionLimit,
    })),
    selectedClubIds,
    demandedClubIds: [...demandedIds].filter((id) => visibleIds.has(id)),
    maxQuotaClubs: MAX_CLUB_SELECTIONS,
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
      const payload = await clubPayload(student.id, student.grade)
      return NextResponse.json({
        student: {
          firstName: student.firstName,
          lastName: student.lastName,
          grade: student.grade,
        },
        ...payload,
      })
    }

    const rawClubIds: unknown[] = Array.isArray(body.clubIds) ? body.clubIds : []
    const clubIds = Array.from(
      new Set(rawClubIds.map((id) => String(id ?? "").trim()).filter((id) => id.length > 0))
    )

    const result = await prisma.$transaction(async (tx) => {
      const clubs = clubIds.length
        ? await tx.club.findMany({
            where: { id: { in: clubIds } },
            include: { selections: { select: { studentId: true } } },
          })
        : []
      if (clubs.length !== clubIds.length) {
        throw new Error("CLUB_NOT_FOUND")
      }
      if (clubs.some((club) => !clubMatchesStudentGrade(club.gradeLevels, student.grade))) {
        throw new Error("GRADE_MISMATCH")
      }
      if (isOverClubSelectionQuota(clubIds, clubs)) {
        throw new Error("QUOTA")
      }

      const fullClubs: string[] = []
      for (const club of clubs) {
        const others = club.selections.filter((sel) => sel.studentId !== student.id).length
        if (others >= club.capacity) fullClubs.push(club.name)
      }
      if (fullClubs.length > 0) {
        throw new Error(`FULL:${fullClubs.join("|")}`)
      }

      const visibleClubs = await tx.club.findMany({ select: { id: true, gradeLevels: true } })
      const visibleIds = visibleClubs
        .filter((club) => clubMatchesStudentGrade(club.gradeLevels, student.grade))
        .map((club) => club.id)
      await tx.clubSelection.deleteMany({
        where: { studentId: student.id, clubId: { in: visibleIds } },
      })
      if (clubIds.length > 0) {
        await tx.clubSelection.createMany({
          data: clubIds.map((clubId) => ({ studentId: student.id, clubId })),
          skipDuplicates: true,
        })
        await tx.clubDemandRequest.deleteMany({
          where: { studentId: student.id, clubId: { in: clubIds } },
        })
      }
      return { saved: clubIds.length }
    })

    const payload = await clubPayload(student.id, student.grade)
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
    if (message === "GRADE_MISMATCH") {
      return NextResponse.json({ error: "Seçilen kulüpler öğrencinin sınıfına açık değil" }, { status: 400 })
    }
    if (message === "QUOTA") {
      return NextResponse.json(
        {
          error: `En fazla ${MAX_CLUB_SELECTIONS} kulüp seçebilirsiniz (kota dışı kulüpler bu sayıya dahil değildir)`,
        },
        { status: 400 }
      )
    }
    console.error("Public club selection error:", error)
    return NextResponse.json({ error: "İşlem tamamlanamadı" }, { status: 500 })
  }
}
