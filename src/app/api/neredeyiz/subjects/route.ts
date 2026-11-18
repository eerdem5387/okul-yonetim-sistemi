import { NextRequest, NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { forbidden, requireNeredeyiz, requireNeredeyizManager } from "@/lib/neredeyiz/access"
import { ensureSubjectForClass } from "@/lib/neredeyiz/sync"
import { resolveNeredeyizYearId } from "@/lib/neredeyiz/year-scope"

/**
 * GET - Dersler.
 * classId verilmezse akademik yıl uygulanır (varsayılan aktif yıl).
 * Öğretmen yalnız kendi derslerini, rehber yalnız kendi sınıflarını (counselorId=kendisi) sorgular.
 */
export async function GET(request: NextRequest) {
  const guard = await requireNeredeyiz(request, "view")
  if (!guard.ok) return guard.response
  const actor = guard.actor
  try {
    const sp = request.nextUrl.searchParams
    const classId = sp.get("classId")
    const grade = sp.get("grade")
    const section = sp.get("section")
    let staffId = sp.get("staffId")
    const counselorId = sp.get("counselorId")

    if (actor.isTeacher && !actor.superAdmin) {
      if (staffId && staffId !== actor.staffId) return forbidden()
      staffId = actor.staffId
    }
    if (counselorId && counselorId !== actor.staffId && actor.department === "REHBERLIK") return forbidden()

    const where: Prisma.SubjectWhereInput = {}
    if (classId) where.classId = classId
    else {
      const yearId = await resolveNeredeyizYearId(sp)
      if (yearId) where.academicYearId = yearId
      if (grade && Number.isFinite(Number.parseInt(grade, 10))) where.grade = Number.parseInt(grade, 10)
      if (section) where.section = section
    }
    if (counselorId) where.class = { counselorId }
    if (staffId) where.assignments = { some: { staffId } }

    const subjects = await prisma.subject.findMany({
      where,
      include: {
        academicYear: { select: { id: true, name: true, isActive: true } },
        class: { select: { id: true, name: true, grade: true, section: true } },
        assignments: { include: { staff: { select: { id: true, firstName: true, lastName: true } } } },
        units: {
          orderBy: { order: "asc" },
          include: { topics: { orderBy: { order: "asc" }, include: { completion: true } } },
        },
        _count: { select: { schedules: true } },
      },
      orderBy: [{ grade: "asc" }, { section: "asc" }, { name: "asc" }],
    })
    return NextResponse.json(subjects)
  } catch (error) {
    console.error("Error fetching subjects:", error)
    return NextResponse.json({ error: "Dersler getirilirken hata oluştu" }, { status: 500 })
  }
}

/**
 * POST - Sınıfa ders kabuğu ekle (normalde ders programından otomatik oluşur).
 * Aynı adlı ders varsa onu döndürür (ders programıyla aynı eşleştirme kuralı).
 */
export async function POST(request: NextRequest) {
  const guard = await requireNeredeyizManager(request, "create")
  if (!guard.ok) return guard.response
  try {
    const body = (await request.json()) as { name?: string; classId?: string; code?: string; description?: string }
    const name = body.name?.trim()
    const classId = body.classId?.trim()
    if (!name || !classId) return NextResponse.json({ error: "Ders adı ve sınıf zorunludur" }, { status: 400 })

    const classData = await prisma.class.findUnique({
      where: { id: classId },
      select: { id: true, academicYearId: true, grade: true, section: true },
    })
    if (!classData) return NextResponse.json({ error: "Sınıf bulunamadı" }, { status: 404 })

    const subject = await ensureSubjectForClass(classData, name)
    const updated = await prisma.subject.update({
      where: { id: subject.id },
      data: {
        ...(body.code !== undefined && { code: body.code?.trim() || null }),
        ...(body.description !== undefined && { description: body.description?.trim() || null }),
      },
    })
    return NextResponse.json(updated, { status: 201 })
  } catch (error) {
    console.error("Error creating subject:", error)
    return NextResponse.json({ error: "Ders oluşturulurken hata oluştu" }, { status: 500 })
  }
}
