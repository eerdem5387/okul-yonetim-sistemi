import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { readBearerToken, verifySessionToken } from "@/lib/auth/session-token"
import { forbiddenResponse, unauthorizedResponse } from "@/lib/auth/api-guard"

/**
 * GET /api/parents/my-students
 * Giriş yapmış velinin öğrencilerini döndürür.
 *
 * Veli kimliği imzalı oturum token'ından alınır. `?parentId=` eski istemciler için hâlâ kabul edilir
 * ama yalnızca token'daki veliyle aynıysa (başka velinin verisi istenemez).
 */
export async function GET(request: NextRequest) {
  try {
    const verified = verifySessionToken(readBearerToken(request), "parent")
    if (!verified) return unauthorizedResponse()
    const parentId = verified.subjectId

    const requestedParentId = new URL(request.url).searchParams.get("parentId")
    if (requestedParentId && requestedParentId !== parentId) {
      return forbiddenResponse("Bu veli hesabının bilgilerine erişiminiz yok.")
    }

    const parentAccount = await prisma.parent.findUnique({
      where: { id: parentId },
      include: {
        students: {
          include: {
            student: {
              include: {
                classAssignments: {
                  orderBy: { createdAt: "desc" },
                  include: {
                    class: {
                      select: {
                        id: true,
                        name: true,
                        grade: true,
                        section: true,
                        academicYear: { select: { isActive: true } },
                        counselor: {
                          select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            phone: true,
                            email: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!parentAccount || !parentAccount.isActive) {
      return NextResponse.json(
        { error: "Veli bulunamadı veya hesap aktif değil" },
        { status: 404 }
      )
    }

    // Aynı öğrenci anne ve baba için iki satırla bağlı olabilir → öğrenci başına tek kayıt
    const seen = new Set<string>()
    const studentsList = parentAccount.students
      .filter((ps) => {
        if (!ps.student || seen.has(ps.studentId)) return false
        seen.add(ps.studentId)
        return true
      })
      .map((ps) => {
        const student = ps.student
        // Aktif akademik yıldaki sınıf; yoksa en son atama
        const assignment =
          student.classAssignments.find((a) => a.class.academicYear?.isActive) ??
          student.classAssignments[0]
        const cls = assignment?.class
        return {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          tcNumber: student.tcNumber,
          birthDate: student.birthDate,
          grade: student.grade,
          phone: student.phone,
          email: student.email,
          address: student.address,
          class: cls
            ? {
                id: cls.id,
                name: cls.name,
                grade: cls.grade,
                section: cls.section,
                counselor: cls.counselor,
              }
            : null,
          parents: parentAccount.students
            .filter((p) => p.studentId === student.id)
            .map((p) => ({
              name: p.parentName,
              tcNumber: p.parentTcNumber,
              phone: p.parentPhone,
              email: p.parentEmail,
              relation: p.relation,
            })),
        }
      })

    return NextResponse.json({ students: studentsList })
  } catch (error) {
    console.error("Error fetching parent students:", error)
    return NextResponse.json(
      { error: "Öğrenci bilgileri alınırken bir hata oluştu" },
      { status: 500 }
    )
  }
}
