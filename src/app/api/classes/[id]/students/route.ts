import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { getRenewalTargetContext, registrationStatusText } from "@/lib/student-registration-meta"

/**
 * GET /api/classes/[id]/students
 * Sınıftaki öğrencileri getirir
 * 
 * Yetki: Yönetici, Müdür, Öğrenci İşleri, Rehberlik
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const { id: classId } = params
    const registrationMeta =
      new URL(request.url).searchParams.get("registrationMeta") === "1" ||
      new URL(request.url).searchParams.get("registrationMeta") === "true"

    // Sınıf kontrolü
    const classData = await prisma.class.findUnique({
      where: { id: classId },
    })

    if (!classData) {
      return NextResponse.json(
        { error: "Sınıf bulunamadı" },
        { status: 404 }
      )
    }

    // Sınıftaki öğrencileri getir
    const classStudents = await prisma.classStudent.findMany({
      where: { classId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            tcNumber: true,
            grade: true,
            birthDate: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: {
        student: {
          firstName: "asc",
        },
      },
    })

    const regCtx = await getRenewalTargetContext(prisma)

    const rosterRows =
      regCtx.futureYearOnlyNewRegistrationStudentIds.size > 0
        ? classStudents.filter((cs) => !regCtx.futureYearOnlyNewRegistrationStudentIds.has(cs.student.id))
        : classStudents

    const studentsPayload = rosterRows.map((cs) => {
      const base = cs.student as Record<string, unknown>
      if (!registrationMeta) return base
      return {
        ...base,
        registrationStatusText: registrationStatusText(
          regCtx.target,
          cs.student.id,
          regCtx.renewedStudentIds,
          regCtx.newRegistrationStudentIds
        ),
      }
    })

    return NextResponse.json({
      students: studentsPayload,
      class: {
        id: classData.id,
        name: classData.name,
        grade: classData.grade,
        section: classData.section,
      },
    })
  } catch (error) {
    console.error("Error fetching class students:", error)
    return NextResponse.json(
      { error: "Öğrenciler getirilirken bir hata oluştu" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/classes/[id]/students
 * Sınıfa öğrenci ekler
 * 
 * Body:
 * - studentIds: string[] - Eklenecek öğrenci ID'leri
 * 
 * Yetki: Yönetici, Müdür, Öğrenci İşleri
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const { id: classId } = params
    const body = await request.json()
    const { studentIds } = body

    // Validasyon
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { error: "studentIds dizisi gereklidir ve boş olmamalıdır" },
        { status: 400 }
      )
    }

    // Sınıf kontrolü
    const classData = await prisma.class.findUnique({
      where: { id: classId },
    })

    if (!classData) {
      return NextResponse.json(
        { error: "Sınıf bulunamadı" },
        { status: 404 }
      )
    }

    const uniqueIds = [
      ...new Set(
        studentIds.filter((sid: unknown): sid is string => typeof sid === "string" && sid.trim().length > 0)
      ),
    ]

    if (uniqueIds.length === 0) {
      return NextResponse.json({ error: "Geçerli öğrenci kimliği bulunamadı" }, { status: 400 })
    }

    const existing = await prisma.classStudent.findMany({
      where: { classId, studentId: { in: uniqueIds } },
      select: { studentId: true },
    })
    const alreadyIn = new Set(existing.map((e) => e.studentId))
    const toAdd = uniqueIds.filter((sid) => !alreadyIn.has(sid))

    if (toAdd.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Seçilen öğrencilerin tümü zaten bu sınıfta",
        added: 0,
        skippedAlreadyInClass: uniqueIds.length,
        invalidOrMissing: 0,
      })
    }

    const found = await prisma.student.findMany({
      where: { id: { in: toAdd } },
      select: { id: true },
    })
    const foundSet = new Set(found.map((s) => s.id))
    const validToAdd = toAdd.filter((sid) => foundSet.has(sid))
    const invalidOrMissing = toAdd.length - validToAdd.length

    if (validToAdd.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Geçerli öğrenci kaydı bulunamadı",
          added: 0,
          skippedAlreadyInClass: alreadyIn.size,
          invalidOrMissing,
        },
        { status: 400 }
      )
    }

    const { count } = await prisma.classStudent.createMany({
      data: validToAdd.map((studentId) => ({ classId, studentId })),
      skipDuplicates: true,
    })

    const skippedAlreadyInClass = uniqueIds.filter((sid) => alreadyIn.has(sid)).length

    return NextResponse.json({
      success: true,
      message: `${count} öğrenci sınıfa eklendi`,
      added: count,
      skippedAlreadyInClass,
      invalidOrMissing,
    })
  } catch (error) {
    console.error("Error adding students to class:", error)
    
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Bazı öğrenciler zaten bu sınıfta kayıtlı" },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Öğrenciler eklenirken bir hata oluştu" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/classes/[id]/students/[studentId]
 * Sınıftan öğrenci çıkarır
 * 
 * Yetki: Yönetici, Müdür, Öğrenci İşleri
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const { id: classId } = params
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")

    if (!studentId) {
      return NextResponse.json(
        { error: "studentId parametresi gereklidir" },
        { status: 400 }
      )
    }

    // ClassStudent kaydını bul ve sil
    const classStudent = await prisma.classStudent.findFirst({
      where: {
        classId,
        studentId,
      },
    })

    if (!classStudent) {
      return NextResponse.json(
        { error: "Öğrenci bu sınıfta kayıtlı değil" },
        { status: 404 }
      )
    }

    await prisma.classStudent.delete({
      where: { id: classStudent.id },
    })

    return NextResponse.json({
      success: true,
      message: "Öğrenci sınıftan çıkarıldı",
    })
  } catch (error) {
    console.error("Error removing student from class:", error)
    return NextResponse.json(
      { error: "Öğrenci çıkarılırken bir hata oluştu" },
      { status: 500 }
    )
  }
}

