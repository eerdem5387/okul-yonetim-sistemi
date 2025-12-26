import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/parents/my-students
 * Velinin öğrencilerini döndürür
 * 
 * Query:
 * - parentId: string (Veli ID)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get("parentId")

    if (!parentId) {
      return NextResponse.json(
        { error: "Veli ID gereklidir" },
        { status: 400 }
      )
    }

    // Veli kontrolü
    const parent = await prisma.parent.findUnique({
      where: { id: parentId },
    })

    if (!parent || !parent.isActive) {
      return NextResponse.json(
        { error: "Veli bulunamadı veya hesap aktif değil" },
        { status: 404 }
      )
    }

    // Öğrenciyi getir (detaylı bilgilerle)
    const parentAccount = await prisma.parent.findUnique({
      where: { id: parentId },
      include: {
        students: {
          include: {
            student: {
              include: {
                classAssignments: {
                  include: {
                    class: {
                      select: {
                        id: true,
                        name: true,
                        grade: true,
                        section: true,
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

    if (!parentAccount) {
      return NextResponse.json(
        { error: "Hesap bulunamadı" },
        { status: 404 }
      )
    }

    // Response formatla (tüm öğrenciler)
    const studentsList = parentAccount.students
      .filter((ps) => ps.student) // Öğrenci bilgisi olanları filtrele
      .map((ps) => {
        const student = ps.student
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
          class: student.classAssignments[0]?.class || null,
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

