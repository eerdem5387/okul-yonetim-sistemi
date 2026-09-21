import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { clubMatchesStudentGrade } from "@/lib/club-grade-levels"
import {
  instructorSelect,
  isClubInstructor,
  resolveClubStaffActor,
} from "@/lib/clubs/access"

export const dynamic = "force-dynamic"

/** Öğretmene atanmış kulüpler */
export async function GET(request: NextRequest) {
  const actor = await resolveClubStaffActor(request)
  if (!actor) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 })
  }

  const clubs = await prisma.club.findMany({
    where: { instructorId: actor.staffId },
    include: {
      instructor: { select: instructorSelect },
      _count: { select: { selections: true } },
      membershipRequests: {
        where: { status: "PENDING" },
        select: { id: true },
      },
    },
    orderBy: { name: "asc" },
  })

  return NextResponse.json({
    clubs: clubs.map((club) => ({
      id: club.id,
      name: club.name,
      description: club.description,
      capacity: club.capacity,
      gradeLevels: club.gradeLevels,
      instructor: club.instructor,
      memberCount: club._count.selections,
      pendingRequestCount: club.membershipRequests.length,
    })),
  })
}

/** Öğretmen: ekleme/çıkarma talebi (onaya düşer) */
export async function POST(request: NextRequest) {
  const actor = await resolveClubStaffActor(request)
  if (!actor) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const clubId = String(body.clubId ?? "").trim()
  const studentId = String(body.studentId ?? "").trim()
  const changeType = body.changeType === "REMOVE" ? "REMOVE" : body.changeType === "ADD" ? "ADD" : null
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : null

  if (!clubId || !studentId || !changeType) {
    return NextResponse.json({ error: "clubId, studentId ve changeType gerekli" }, { status: 400 })
  }

  if (!(await isClubInstructor(clubId, actor.staffId))) {
    return NextResponse.json({ error: "Bu kulüp size atanmamış" }, { status: 403 })
  }

  const [club, student, existingSelection, pending] = await Promise.all([
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
    prisma.clubMembershipRequest.findFirst({
      where: { clubId, studentId, changeType, status: "PENDING" },
    }),
  ])

  if (!club) return NextResponse.json({ error: "Kulüp bulunamadı" }, { status: 404 })
  if (!student) return NextResponse.json({ error: "Öğrenci bulunamadı" }, { status: 404 })
  if (!clubMatchesStudentGrade(club.gradeLevels, student.grade)) {
    return NextResponse.json({ error: "Öğrencinin sınıfı bu kulübe uygun değil" }, { status: 400 })
  }
  if (pending) {
    return NextResponse.json({ error: "Bu işlem için zaten bekleyen bir talep var" }, { status: 409 })
  }

  if (changeType === "ADD") {
    if (existingSelection) {
      return NextResponse.json({ error: "Öğrenci zaten bu kulüpte" }, { status: 400 })
    }
    if (club._count.selections >= club.capacity) {
      return NextResponse.json({ error: "Kulüp kontenjanı dolu" }, { status: 400 })
    }
  } else if (!existingSelection) {
    return NextResponse.json({ error: "Öğrenci bu kulüpte değil" }, { status: 400 })
  }

  const requestRow = await prisma.clubMembershipRequest.create({
    data: {
      clubId,
      studentId,
      changeType,
      requestedById: actor.staffId,
      note,
      status: "PENDING",
    },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, grade: true, tcNumber: true } },
      club: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({
    success: true,
    pendingApproval: true,
    request: requestRow,
    message: "Talebiniz onaya gönderildi",
  })
}
