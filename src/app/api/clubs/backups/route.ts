import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type BackupListItem = {
  id: string
  academicYearId: string
  academicYearName: string
  createdAt: Date
  updatedAt: Date
  _count: { clubs: number }
  clubs: Array<{ _count: { members: number } }>
}

function serializeBackup(row: BackupListItem) {
  const studentCount = row.clubs.reduce((sum, club) => sum + club._count.members, 0)
  return {
    id: row.id,
    academicYearId: row.academicYearId,
    academicYearName: row.academicYearName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    clubCount: row._count.clubs,
    studentCount,
  }
}

const backupInclude = {
  _count: { select: { clubs: true } },
  clubs: { select: { _count: { select: { members: true } } } },
} as const

export async function GET() {
  try {
    const backups = await prisma.clubBackup.findMany({
      include: backupInclude,
      orderBy: { updatedAt: "desc" },
    })
    return NextResponse.json({ backups: backups.map(serializeBackup) })
  } catch (error) {
    console.error("Error listing club backups:", error)
    return NextResponse.json({ error: "Yedekler alınamadı" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const academicYearId = String(body.academicYearId ?? "").trim()
    const replace = Boolean(body.replace)

    if (!academicYearId) {
      return NextResponse.json({ error: "Akademik yıl seçin" }, { status: 400 })
    }

    const year = await prisma.academicYear.findUnique({ where: { id: academicYearId } })
    if (!year || year.parentActiveYearId) {
      return NextResponse.json({ error: "Geçerli bir akademik yıl seçin" }, { status: 400 })
    }

    const existing = await prisma.clubBackup.findUnique({
      where: { academicYearId },
      include: backupInclude,
    })
    if (existing && !replace) {
      return NextResponse.json(
        {
          error: `${year.name} için yedek zaten var. Üzerine yazmak için onaylayın.`,
          existing: serializeBackup(existing),
        },
        { status: 409 }
      )
    }

    const clubs = await prisma.club.findMany({
      include: {
        selections: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                grade: true,
                tcNumber: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    })

    const backup = await prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.clubBackup.delete({ where: { id: existing.id } })
      }
      const created = await tx.clubBackup.create({
        data: {
          academicYearId: year.id,
          academicYearName: year.name,
          clubs: {
            create: clubs.map((club) => ({
              sourceClubId: club.id,
              name: club.name,
              description: club.description,
              capacity: club.capacity,
              members: {
                create: club.selections
                  .filter((sel) => sel.student)
                  .map((sel) => ({
                    studentId: sel.student.id,
                    firstName: sel.student.firstName,
                    lastName: sel.student.lastName,
                    grade: sel.student.grade,
                    tcNumber: sel.student.tcNumber,
                    selectedAt: sel.createdAt,
                  })),
              },
            })),
          },
        },
        include: backupInclude,
      })
      // Yedek alındıktan sonra canlı kulüp listesini sıfırla (seçimler cascade ile silinir).
      await tx.club.deleteMany()
      return created
    })

    const studentCount = clubs.reduce((sum, club) => sum + club.selections.length, 0)
    return NextResponse.json({
      backup: serializeBackup(backup),
      clubCount: clubs.length,
      studentCount,
      replaced: Boolean(existing),
    })
  } catch (error) {
    console.error("Error creating club backup:", error)
    return NextResponse.json({ error: "Yedek alınamadı" }, { status: 500 })
  }
}
