import { ActivityVerificationStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  activityMainTypeToIbViewer,
  emptyIbMainTypeCounts,
} from "@/lib/activity-main-type-to-ib-viewer"
import type { IbMainType } from "@/lib/ib-activity-types"

const APPROVED = ActivityVerificationStatus.ONAYLANDI

export async function getApprovedParticipantRows() {
  return prisma.activityParticipant.findMany({
    where: { verificationStatus: APPROVED },
    select: {
      studentId: true,
      activity: { select: { mainType: true } },
      student: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  })
}

export async function getIbViewerDashboardStats() {
  const rows = await getApprovedParticipantRows()
  const total = rows.length
  const byMainType = emptyIbMainTypeCounts()

  const studentCountMap = new Map<string, { studentId: string; name: string; count: number }>()

  for (const row of rows) {
    const main = activityMainTypeToIbViewer(row.activity.mainType)
    byMainType[main]++

    const name = row.student
      ? `${row.student.firstName} ${row.student.lastName}`
      : "Bilinmeyen"
    const prev = studentCountMap.get(row.studentId)
    if (prev) prev.count++
    else studentCountMap.set(row.studentId, { studentId: row.studentId, name, count: 1 })
  }

  const students = Array.from(studentCountMap.values()).sort((a, b) => b.count - a.count)

  return { total, byMainType, students }
}

export async function getIbViewerStudentDashboard(studentId: string) {
  const [student, allApprovedCount, studentRows] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, firstName: true, lastName: true, grade: true },
    }),
    prisma.activityParticipant.count({ where: { verificationStatus: APPROVED } }),
    prisma.activityParticipant.findMany({
      where: { studentId, verificationStatus: APPROVED },
      select: { activity: { select: { mainType: true } } },
    }),
  ])

  if (!student) return null

  const byMainType = emptyIbMainTypeCounts()
  for (const row of studentRows) {
    const main = activityMainTypeToIbViewer(row.activity.mainType)
    byMainType[main]++
  }

  const totalParticipations = studentRows.length
  const participationPercent =
    allApprovedCount > 0
      ? Math.round((totalParticipations / allApprovedCount) * 100)
      : 0

  return {
    student: {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      fullName: `${student.firstName} ${student.lastName}`,
      grade: student.grade,
    },
    totalParticipations,
    allActivitiesCount: allApprovedCount,
    participationPercent,
    byMainType,
  }
}

export type IbViewerStudentActivityRow = {
  id: string
  title: string
  mainType: IbMainType
  startDate: Date
  endDate: Date
  organizerName: string
}

export async function getApprovedActivitiesForStudentPdf(studentId: string) {
  const rows = await prisma.activityParticipant.findMany({
    where: { studentId, verificationStatus: APPROVED },
    include: {
      activity: {
        select: {
          id: true,
          title: true,
          mainType: true,
          startDate: true,
          endDate: true,
          organizerName: true,
          description: true,
          outcome: true,
        },
      },
    },
    orderBy: { activity: { startDate: "asc" } },
  })

  return rows.map((r) => ({
    participantId: r.id,
    activityId: r.activity.id,
    title: r.activity.title,
    description: r.activity.description,
    outcome: r.activity.outcome,
    startDate: r.activity.startDate,
    endDate: r.activity.endDate,
    organizerName: r.activity.organizerName,
    mainTypeLabel: activityMainTypeToIbViewer(r.activity.mainType),
  }))
}
