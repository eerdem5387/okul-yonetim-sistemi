import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { forbidden, requireNeredeyiz, requireNeredeyizManager } from "@/lib/neredeyiz/access"

type Ctx = { params: Promise<{ id: string }> }

// GET - Tek ders (üniteler, konular ve tamamlama kayıtları). Ayrıntılı geçmiş için /history.
export async function GET(request: NextRequest, context: Ctx) {
  const guard = await requireNeredeyiz(request, "view")
  if (!guard.ok) return guard.response
  const actor = guard.actor
  try {
    const { id } = await context.params
    const subject = await prisma.subject.findUnique({
      where: { id },
      include: {
        academicYear: true,
        class: { select: { id: true, name: true, counselorId: true } },
        assignments: { include: { staff: { select: { id: true, firstName: true, lastName: true, department: true } } } },
        units: {
          orderBy: { order: "asc" },
          include: { topics: { orderBy: { order: "asc" }, include: { completion: true } } },
        },
      },
    })
    if (!subject) return NextResponse.json({ error: "Ders bulunamadı" }, { status: 404 })
    if (actor.isTeacher && !actor.superAdmin && !subject.assignments.some((a) => a.staffId === actor.staffId)) {
      return forbidden("Bu derse atanmamışsınız.")
    }
    return NextResponse.json({ subject, ...subject })
  } catch (error) {
    console.error("Error fetching subject:", error)
    return NextResponse.json({ error: "Ders getirilirken hata oluştu" }, { status: 500 })
  }
}

/**
 * PUT - Kod / açıklama / branş.
 * Ders adı ve sınıfı ders programından gelir; programa bağlı derste ad değişmez, sınıf hiçbir zaman değişmez.
 */
export async function PUT(request: NextRequest, context: Ctx) {
  const guard = await requireNeredeyizManager(request, "edit")
  if (!guard.ok) return guard.response
  try {
    const { id } = await context.params
    const existing = await prisma.subject.findUnique({
      where: { id },
      include: { _count: { select: { schedules: true } } },
    })
    if (!existing) return NextResponse.json({ error: "Ders bulunamadı" }, { status: 404 })
    const body = (await request.json()) as {
      name?: string
      code?: string | null
      description?: string | null
      branchId?: string | null
      classId?: string
    }
    if (body.classId !== undefined && body.classId !== existing.classId) {
      return NextResponse.json({ error: "Dersin sınıfı değiştirilemez; doğru sınıfta yeni ders oluşturun." }, { status: 400 })
    }
    const newName = body.name?.trim()
    if (newName !== undefined && !newName) return NextResponse.json({ error: "Ders adı boş olamaz" }, { status: 400 })
    if (newName && newName !== existing.name && existing._count.schedules > 0) {
      return NextResponse.json(
        { error: "Bu ders ders programına bağlı; adını ders programından değiştirin." },
        { status: 400 },
      )
    }
    const subject = await prisma.subject.update({
      where: { id },
      data: {
        ...(newName && { name: newName }),
        ...(body.code !== undefined && { code: body.code?.trim() || null }),
        ...(body.description !== undefined && { description: body.description?.trim() || null }),
        ...(body.branchId !== undefined && { branchId: body.branchId?.trim() || null }),
      },
    })
    return NextResponse.json(subject)
  } catch (error) {
    console.error("Error updating subject:", error)
    return NextResponse.json({ error: "Ders güncellenirken hata oluştu" }, { status: 500 })
  }
}

// DELETE - Ders, üniteleri, konuları ve tamamlama kayıtları silinir (veritabanı zinciri). Programa bağlı ders silinemez.
export async function DELETE(request: NextRequest, context: Ctx) {
  const guard = await requireNeredeyizManager(request, "delete")
  if (!guard.ok) return guard.response
  try {
    const { id } = await context.params
    const existing = await prisma.subject.findUnique({
      where: { id },
      include: { _count: { select: { schedules: true } } },
    })
    if (!existing) return NextResponse.json({ error: "Ders bulunamadı" }, { status: 404 })
    if (existing._count.schedules > 0) {
      return NextResponse.json(
        { error: "Bu ders ders programında kullanılıyor; önce ders programından kaldırın." },
        { status: 400 },
      )
    }
    await prisma.subject.delete({ where: { id } })
    return NextResponse.json({ message: "Ders silindi" })
  } catch (error) {
    console.error("Error deleting subject:", error)
    return NextResponse.json({ error: "Ders silinirken hata oluştu" }, { status: 500 })
  }
}
