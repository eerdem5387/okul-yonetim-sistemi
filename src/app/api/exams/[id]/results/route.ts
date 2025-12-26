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

/**
 * POST /api/exams/[id]/results
 * Toplu sınav sonuçları girer
 * 
 * Body:
 * - results: Array<{
 *     studentId: string,
 *     scores: object (JSON),
 *     totalScore?: number,
 *     ranking?: number,
 *     percentile?: number,
 *     notes?: string
 *   }>
 * - enteredById: string (Staff ID - rehberlik)
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: examId } = await context.params
    const body = await request.json()
    const { results, enteredById } = body

    // Validasyon
    if (!results || results.length === 0 || !enteredById) {
      return NextResponse.json(
        { error: "Sonuçlar ve giren kişi ID'si gereklidir" },
        { status: 400 }
      )
    }

    // Toplu sonuç girişi (upsert kullanarak mevcut sonuçları günceller veya yeni oluşturur)
    const createdResults = await Promise.all(
      results.map((result: {
        studentId: string
        scores: object
        totalScore?: number
        ranking?: number
        percentile?: number
        notes?: string
      }) =>
        prisma.examResult.upsert({
          where: {
            examId_studentId: {
              examId,
              studentId: result.studentId,
            },
          },
          update: {
            scores: result.scores,
            totalScore: result.totalScore,
            ranking: result.ranking,
            percentile: result.percentile,
            notes: result.notes,
            enteredById,
          },
          create: {
            examId,
            studentId: result.studentId,
            scores: result.scores,
            totalScore: result.totalScore,
            ranking: result.ranking,
            percentile: result.percentile,
            notes: result.notes,
            enteredById,
          },
        })
      )
    )

    return NextResponse.json({
      success: true,
      count: createdResults.length,
      message: `${createdResults.length} öğrenci için sınav sonucu kaydedildi`,
    })
  } catch (error) {
    console.error("Error creating exam results:", error)
    return NextResponse.json(
      { error: "Sınav sonuçları kaydedilirken bir hata oluştu" },
      { status: 500 }
    )
  }
}

