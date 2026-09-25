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

    // Yoklamalar — istatistik tüm dönem, liste son kayıtlar
    const attendanceWhere = {
      studentId: id,
      ...(startDate && {
        date: {
          gte: startDate,
        },
      }),
    }

    const attendanceInclude = {
      teacher: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      class: {
        select: { id: true, name: true },
      },
      studyGroupSession: {
        select: {
          id: true,
          topic: true,
          studyGroup: { select: { id: true, name: true, gradeLevel: true } },
        },
      },
      clubSchedule: {
        select: {
          id: true,
          club: { select: { id: true, name: true } },
        },
      },
    } as const

    const [attendanceGroups, attendances] = await Promise.all([
      prisma.attendance.groupBy({
        by: ["kind", "status"],
        where: attendanceWhere,
        _count: { _all: true },
      }),
      prisma.attendance.findMany({
        where: attendanceWhere,
        include: attendanceInclude,
        orderBy: {
          date: "desc",
        },
        take: 100,
      }),
    ])

    // Sınavlar (yalnızca yayınlanmış)
    const examResults = await prisma.examResult.findMany({
      where: {
        studentId: id,
        exam: { status: "PUBLISHED" },
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
            status: true,
            class: {
              select: {
                name: true,
              },
            },
          },
        },
        answers: {
          include: {
            question: {
              include: { outcome: true },
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

    // IB Faaliyetleri (son 30 gün veya seçilen period)
    const activities = await prisma.activity.findMany({
      where: {
        studentId: id,
        ...(startDate && {
          activityDate: {
            gte: startDate,
          },
        }),
      },
      orderBy: {
        activityDate: "desc",
      },
      take: 10,
    })

    // İstatistikler
    const totalHomeworks = homeworks.length
    const completedHomeworks = homeworks.filter((h) => h.isCompleted).length
    const homeworkCompletionRate =
      totalHomeworks > 0 ? Math.round((completedHomeworks / totalHomeworks) * 100) : 0

    type KindKey = "CLASS" | "STUDY_GROUP" | "CLUB"
    type StatusKey = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"
    const emptyStatus = () => ({
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      EXCUSED: 0,
      total: 0,
    })
    const byKind: Record<KindKey, ReturnType<typeof emptyStatus>> = {
      CLASS: emptyStatus(),
      STUDY_GROUP: emptyStatus(),
      CLUB: emptyStatus(),
    }
    let presentCount = 0
    let absentCount = 0
    let lateCount = 0
    let excusedCount = 0
    let totalAttendances = 0

    for (const g of attendanceGroups) {
      const kind = (g.kind || "CLASS") as KindKey
      const status = g.status as StatusKey
      const n = g._count._all
      totalAttendances += n
      if (status === "PRESENT") presentCount += n
      else if (status === "ABSENT") absentCount += n
      else if (status === "LATE") lateCount += n
      else if (status === "EXCUSED") excusedCount += n
      if (byKind[kind]) {
        byKind[kind].total += n
        byKind[kind][status] += n
      }
    }

    const attendanceRate =
      totalAttendances > 0 ? Math.round((presentCount / totalAttendances) * 100) : 100

    const kindRate = (k: KindKey) =>
      byKind[k].total > 0
        ? Math.round((byKind[k].PRESENT / byKind[k].total) * 100)
        : null

    const totalExams = examResults.length
    const averageScore =
      totalExams > 0
        ? Math.round(
            examResults.reduce((sum, r) => sum + (r.totalScore || 0), 0) / totalExams
          )
        : 0

    const positiveComments = comments.filter((c) => c.isPositive).length
    const negativeComments = comments.filter((c) => !c.isPositive).length

    // IB Faaliyet istatistikleri
    const totalActivities = activities.length
    const verifiedActivities = activities.filter((a) => a.isVerified).length

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
        attendanceByKind: {
          CLASS: { ...byKind.CLASS, rate: kindRate("CLASS") },
          STUDY_GROUP: { ...byKind.STUDY_GROUP, rate: kindRate("STUDY_GROUP") },
          CLUB: { ...byKind.CLUB, rate: kindRate("CLUB") },
        },
        averageScore,
        totalExams,
        totalComments: comments.length,
        positiveComments,
        negativeComments,
        totalActivities,
        verifiedActivities,
      },
      recentData: {
        homeworks,
        attendances,
        examResults,
        comments,
        activities,
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

