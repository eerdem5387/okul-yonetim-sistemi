import { requireStaff } from "@/lib/auth/api-guard"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/exams/[id]/results
 * Sınav sonuçlarını listeler
 * 
 * Query:
 * - studentId?: string (Belirli bir öğrencinin sonucu)
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authGuard = await requireStaff(request)
  if (!authGuard.ok) return authGuard.response
  try {
    const { id: examId } = await context.params
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")

    const whereConditions = {
      examId,
      ...(studentId && { studentId }),
    }

    const results = await prisma.examResult.findMany({
      where: whereConditions,
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
        exam: {
          select: {
            id: true,
            name: true,
            examType: true,
            examDate: true,
            grade: true,
          },
        },
        enteredBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        ranking: "asc",
      },
    })

    return NextResponse.json({ results })
  } catch (error) {
    console.error("Error fetching exam results:", error)
    return NextResponse.json(
      { error: "Sınav sonuçları alınırken bir hata oluştu" },
      { status: 500 }
    )
  }
}
