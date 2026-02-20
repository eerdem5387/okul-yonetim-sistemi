import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { activityTypeToMain, type IbMainType } from "@/lib/ib-activity-types"

/** Öğrenci bazlı IB dashboard: türe göre dağılım + katılım oranı (toplam faaliyete göre %) */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await context.params

    const [student, allActivitiesCount, studentActivities] = await Promise.all([
      prisma.student.findUnique({
        where: { id: studentId },
        select: { id: true, firstName: true, lastName: true, grade: true },
      }),
      prisma.activity.count({ where: { isVerified: true } }),
      prisma.activity.findMany({
        where: { studentId, isVerified: true },
        select: { type: true },
      }),
    ])

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    const byMainType: Record<IbMainType, number> = {
      education: 0,
      event: 0,
      sport: 0,
      competition: 0,
    }

    studentActivities.forEach((a) => {
      const main = activityTypeToMain(a.type)
      byMainType[main]++
    })

    const totalParticipations = studentActivities.length
    const participationPercent =
      allActivitiesCount > 0
        ? Math.round((totalParticipations / allActivitiesCount) * 100)
        : 0

    return NextResponse.json({
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        fullName: `${student.firstName} ${student.lastName}`,
        grade: student.grade,
      },
      totalParticipations,
      allActivitiesCount,
      participationPercent,
      byMainType,
    })
  } catch (error) {
    console.error("IB student dashboard error:", error)
    return NextResponse.json(
      { error: "Failed to load student dashboard" },
      { status: 500 }
    )
  }
}
