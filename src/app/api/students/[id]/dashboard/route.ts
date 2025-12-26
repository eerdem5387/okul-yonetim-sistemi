import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/students/[id]/dashboard
 * Öğrenci dashboard verilerini getirir (ödevler, yoklamalar, sınavlar, görüşler)
 * 
 * Query:
 * - period?: string (30days, thisMonth, all) - Varsayılan: 30days
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "30days"

    // Tarih filtresini belirle
    let startDate: Date | undefined
    const now = new Date()

    if (period === "30days") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    } else if (period === "thisMonth") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    // Öğrenci bilgisi
    const student = await prisma.student.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        grade: true,
        tcNumber: true,
        email: true,
        phone: true,
      },
    })

    if (!student) {
      return NextResponse.json(
        { error: "Öğrenci bulunamadı" },
        { status: 404 }
      )
    }

    // Ödevler (son 30 gün veya seçilen period)
    const homeworks = await prisma.homeworkAssignment.findMany({
      where: {
        studentId: id,
        ...(startDate && {
          homework: {
            createdAt: {
              gte: startDate,
            },
          },
        }),
      },
      include: {
        homework: {
          select: {
            id: true,
            title: true,
            description: true,
            dueDate: true,
            subject: true,
            teacher: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        homework: {
          dueDate: "desc",
        },
      },
      take: 10,
    })

    // Yoklamalar (son 30 gün veya seçilen period)
    const attendances = await prisma.attendance.findMany({
      where: {
        studentId: id,
        ...(startDate && {
          date: {
            gte: startDate,
          },
        }),
      },
      include: {
        teacher: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
      take: 20,
    })

    // Sınavlar (son 30 gün veya seçilen period)
    const examResults = await prisma.examResult.findMany({
      where: {
        studentId: id,
        ...(startDate && {
          createdAt: {
            gte: startDate,
          },
        }),
      },
      include: {
        exam: {
          select: {
            id: true,
            name: true,
            examType: true,
            examDate: true,
            grade: true,
            class: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        exam: {
          examDate: "desc",
        },
      },
      take: 10,
    })

    // Görüşler (son 30 gün veya seçilen period)
    const comments = await prisma.studentComment.findMany({
      where: {
        studentId: id,
        ...(startDate && {
          createdAt: {
            gte: startDate,
          },
        }),
      },
      include: {
        staff: {
          select: {
            firstName: true,
            lastName: true,
            department: true,
            subject: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    })

    // İstatistikler
    const totalHomeworks = homeworks.length
    const completedHomeworks = homeworks.filter((h) => h.isCompleted).length
    const homeworkCompletionRate =
      totalHomeworks > 0 ? Math.round((completedHomeworks / totalHomeworks) * 100) : 0

    const totalAttendances = attendances.length
    const presentCount = attendances.filter((a) => a.status === "PRESENT").length
    const absentCount = attendances.filter((a) => a.status === "ABSENT").length
    const lateCount = attendances.filter((a) => a.status === "LATE").length
    const excusedCount = attendances.filter((a) => a.status === "EXCUSED").length
    const attendanceRate =
      totalAttendances > 0 ? Math.round((presentCount / totalAttendances) * 100) : 100

    const totalExams = examResults.length
    const averageScore =
      totalExams > 0
        ? Math.round(
            examResults.reduce((sum, r) => sum + (r.totalScore || 0), 0) / totalExams
          )
        : 0

    const positiveComments = comments.filter((c) => c.isPositive).length
    const negativeComments = comments.filter((c) => !c.isPositive).length

    return NextResponse.json({
      student,
      statistics: {
        homeworkCompletionRate,
        totalHomeworks,
        completedHomeworks,
        pendingHomeworks: totalHomeworks - completedHomeworks,
        attendanceRate,
        totalAttendances,
        presentCount,
        absentCount,
        lateCount,
        excusedCount,
        averageScore,
        totalExams,
        totalComments: comments.length,
        positiveComments,
        negativeComments,
      },
      recentData: {
        homeworks,
        attendances,
        examResults,
        comments,
      },
    })
  } catch (error) {
    console.error("Error fetching student dashboard:", error)
    return NextResponse.json(
      { error: "Dashboard verileri alınırken bir hata oluştu" },
      { status: 500 }
    )
  }
}

