import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const backup = await prisma.clubBackup.findUnique({
      where: { id },
      include: {
        clubs: {
          orderBy: { name: "asc" },
          include: {
            members: {
              orderBy: [{ grade: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
            },
          },
        },
      },
    })
    if (!backup) {
      return NextResponse.json({ error: "Yedek bulunamadı" }, { status: 404 })
    }

    return NextResponse.json({
      id: backup.id,
      academicYearId: backup.academicYearId,
      academicYearName: backup.academicYearName,
      createdAt: backup.createdAt,
      updatedAt: backup.updatedAt,
      clubs: backup.clubs.map((club) => ({
        id: club.id,
        name: club.name,
        description: club.description,
        capacity: club.capacity,
        members: club.members.map((m) => ({
          id: m.id,
          firstName: m.firstName,
          lastName: m.lastName,
          grade: m.grade,
          tcNumber: m.tcNumber,
        })),
      })),
    })
  } catch (error) {
    console.error("Error fetching club backup:", error)
    return NextResponse.json({ error: "Yedek alınamadı" }, { status: 500 })
  }
}
