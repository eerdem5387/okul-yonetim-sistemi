import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireNeredeyizManager } from "@/lib/neredeyiz/access"
import { notifyStaff } from "@/lib/neredeyiz/notify"

type Ctx = { params: Promise<{ id: string }> }

// POST - Derse öğretmen ata (normalde ders programından otomatik gelir)
export async function POST(request: NextRequest, context: Ctx) {
  const guard = await requireNeredeyizManager(request, "edit")
  if (!guard.ok) return guard.response
  try {
    const { id } = await context.params
    const { staffId } = (await request.json()) as { staffId?: string }
    if (!staffId) return NextResponse.json({ error: "Öğretmen ID zorunludur" }, { status: 400 })
    const [subject, staff] = await Promise.all([
      prisma.subject.findUnique({ where: { id }, select: { id: true, name: true, grade: true, section: true } }),
      prisma.staff.findUnique({ where: { id: staffId }, select: { id: true, isActive: true } }),
    ])
    if (!subject) return NextResponse.json({ error: "Ders bulunamadı" }, { status: 404 })
    if (!staff?.isActive) return NextResponse.json({ error: "Personel bulunamadı" }, { status: 404 })

    const exists = await prisma.subjectAssignment.findUnique({ where: { subjectId_staffId: { subjectId: id, staffId } } })
    if (exists) return NextResponse.json({ error: "Bu öğretmen zaten bu derse atanmış" }, { status: 400 })
    const assignment = await prisma.subjectAssignment.create({
      data: { subjectId: id, staffId },
      include: { staff: { select: { id: true, firstName: true, lastName: true } } },
    })
    await notifyStaff({
      staffIds: [staffId],
      type: "OGRETMEN_ATANDI",
      title: "Derse atandınız",
      message: `${subject.grade}${subject.section ? `/${subject.section}` : ""} ${subject.name} dersine atandınız.`,
      relatedSubjectId: id,
    })
    return NextResponse.json(assignment, { status: 201 })
  } catch (error) {
    console.error("Error assigning teacher:", error)
    return NextResponse.json({ error: "Öğretmen atanırken hata oluştu" }, { status: 500 })
  }
}

// DELETE - Atamayı kaldır (?staffId=)
export async function DELETE(request: NextRequest, context: Ctx) {
  const guard = await requireNeredeyizManager(request, "edit")
  if (!guard.ok) return guard.response
  try {
    const { id } = await context.params
    const staffId = request.nextUrl.searchParams.get("staffId")
    if (!staffId) return NextResponse.json({ error: "Öğretmen ID zorunludur" }, { status: 400 })
    const res = await prisma.subjectAssignment.deleteMany({ where: { subjectId: id, staffId } })
    if (res.count === 0) return NextResponse.json({ error: "Atama bulunamadı" }, { status: 404 })
    return NextResponse.json({ message: "Atama kaldırıldı" })
  } catch (error) {
    console.error("Error removing assignment:", error)
    return NextResponse.json({ error: "Atama kaldırılırken hata oluştu" }, { status: 500 })
  }
}
