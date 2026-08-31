import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  getRenewalTargetContext,
  registrationStatusText,
} from "@/lib/student-registration-meta"

/**
 * GET /api/students/[id]/profile
 * Öğrenci profili + sınıf, kayıt, sözleşme, kulüp ve veli görüşmesi özeti
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const student = await prisma.student.findUnique({
      where: { id },
    })

    if (!student) {
      return NextResponse.json({ error: "Öğrenci bulunamadı" }, { status: 404 })
    }

    const regCtx = await getRenewalTargetContext(prisma)
    const statusText = registrationStatusText(
      regCtx.target,
      id,
      regCtx.renewedStudentIds,
      regCtx.newRegistrationStudentIds
    )

    const [
      classAssignments,
      renewals,
      newRegistrations,
      uniformContracts,
      mealContracts,
      serviceContracts,
      bookContracts,
      clubSelections,
      parentMeetings,
      parentLinks,
    ] = await Promise.all([
      prisma.classStudent.findMany({
        where: { studentId: id },
        include: {
          class: {
            include: {
              academicYear: { select: { id: true, name: true, isActive: true } },
              counselor: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.renewal.findMany({
        where: { studentId: id },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.newRegistration.findMany({
        where: { studentId: id },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.uniformContract.findMany({
        where: { studentId: id },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.mealContract.findMany({
        where: { studentId: id },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.serviceContract.findMany({
        where: { studentId: id },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.bookContract.findMany({
        where: { studentId: id },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.clubSelection.findMany({
        where: { studentId: id },
        include: { club: { select: { id: true, name: true, capacity: true } } },
      }),
      prisma.parentMeeting.findMany({
        where: { studentId: id },
        orderBy: { meetingDate: "desc" },
        take: 20,
      }),
      prisma.parentStudent.findMany({
        where: { studentId: id },
        include: {
          parent: {
            select: {
              id: true,
              studentTcNumber: true,
              isActive: true,
              lastLoginAt: true,
            },
          },
        },
      }),
    ])

    return NextResponse.json({
      student: {
        ...student,
        registrationStatusText: statusText,
      },
      classAssignments: classAssignments.map((a) => ({
        id: a.id,
        assignedAt: a.createdAt,
        class: {
          id: a.class.id,
          name: a.class.name,
          grade: a.class.grade,
          section: a.class.section,
          academicYear: a.class.academicYear,
          counselor: a.class.counselor,
        },
      })),
      renewals,
      newRegistrations,
      contracts: {
        uniform: uniformContracts,
        meal: mealContracts,
        service: serviceContracts,
        book: bookContracts,
      },
      clubSelections,
      parentMeetings,
      parentLinks: parentLinks.map((pl) => ({
        id: pl.id,
        relation: pl.relation,
        parentName: pl.parentName,
        parentTcNumber: pl.parentTcNumber,
        parentPhone: pl.parentPhone,
        parentEmail: pl.parentEmail,
        portal: pl.parent,
      })),
    })
  } catch (error) {
    console.error("Error fetching student profile:", error)
    return NextResponse.json(
      { error: "Öğrenci profili yüklenirken bir hata oluştu" },
      { status: 500 }
    )
  }
}
