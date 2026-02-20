import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { activityTypeToMain, type IbMainType } from "@/lib/ib-activity-types"

/** IB Viewer dashboard: 4 ana tür sayıları + toplam + öğrenci listesi (katılım sayısına göre azalan) */
export async function GET() {
  try {
    const activities = await prisma.activity.findMany({
      where: { isVerified: true },
      select: {
        id: true,
        studentId: true,
        type: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    const total = activities.length

    const byMainType: Record<IbMainType, number> = {
      education: 0,
      event: 0,
      sport: 0,
      competition: 0,
    }

    activities.forEach((a) => {
      const main = activityTypeToMain(a.type)
      byMainType[main]++
    })

    const studentCountMap = new Map<string, { studentId: string; name: string; count: number }>()
    activities.forEach((a) => {
      const key = a.studentId
      const name = a.student
        ? `${a.student.firstName} ${a.student.lastName}`
        : "Bilinmeyen"
      const prev = studentCountMap.get(key)
      if (prev) {
        prev.count++
      } else {
        studentCountMap.set(key, {
          studentId: a.studentId,
          name,
          count: 1,
        })
      }
    })

    const students = Array.from(studentCountMap.values()).sort(
      (a, b) => b.count - a.count
    )

    return NextResponse.json({
      total,
      byMainType,
      students,
    })
  } catch (error) {
    console.error("IB dashboard error:", error)
    return NextResponse.json(
      { error: "Failed to load dashboard" },
      { status: 500 }
    )
  }
}
