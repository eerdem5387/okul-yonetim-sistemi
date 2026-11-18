import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireNeredeyiz } from "@/lib/neredeyiz/access"
import { badRequest, guardSubjectPlan } from "@/lib/neredeyiz/plan-helpers"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: Ctx) {
  const guard = await requireNeredeyiz(request, "view")
  if (!guard.ok) return guard.response
  try {
    const { id } = await context.params
    const unit = await prisma.unit.findUnique({
      where: { id },
      include: { subject: true, topics: { orderBy: { order: "asc" }, include: { completion: true } } },
    })
    if (!unit) return NextResponse.json({ error: "Ünite bulunamadı" }, { status: 404 })
    return NextResponse.json(unit)
  } catch (error) {
    console.error("Error fetching unit:", error)
    return NextResponse.json({ error: "Ünite getirilirken hata oluştu" }, { status: 500 })
  }
}

// PUT - Ad / açıklama / sıra. Sıra değişirse diğer ünitelerle yer değiştirilir.
export async function PUT(request: NextRequest, context: Ctx) {
  const guard = await requireNeredeyiz(request, "edit")
  if (!guard.ok) return guard.response
  try {
    const { id } = await context.params
    const existing = await prisma.unit.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Ünite bulunamadı" }, { status: 404 })
    const plan = await guardSubjectPlan(guard.actor, existing.subjectId)
    if (!plan.ok) return plan.response

    const body = (await request.json()) as { name?: string; description?: string | null; order?: unknown }
    if (body.name !== undefined && !body.name.trim()) return badRequest("Ünite adı boş olamaz")
    const order = body.order !== undefined && Number.isFinite(Number(body.order)) ? Number(body.order) : undefined

    const unit = await prisma.$transaction(async (tx) => {
      if (order !== undefined && order !== existing.order) {
        const other = await tx.unit.findFirst({ where: { subjectId: existing.subjectId, order } })
        if (other) await tx.unit.update({ where: { id: other.id }, data: { order: existing.order } })
      }
      return tx.unit.update({
        where: { id },
        data: {
          ...(body.name !== undefined && { name: body.name.trim() }),
          ...(body.description !== undefined && { description: body.description?.trim() || null }),
          ...(order !== undefined && { order }),
        },
      })
    })
    return NextResponse.json(unit)
  } catch (error) {
    console.error("Error updating unit:", error)
    return NextResponse.json({ error: "Ünite güncellenirken hata oluştu" }, { status: 500 })
  }
}

// DELETE - Ünite ve konuları (tamamlama kayıtları dahil) silinir
export async function DELETE(request: NextRequest, context: Ctx) {
  const guard = await requireNeredeyiz(request, "edit")
  if (!guard.ok) return guard.response
  try {
    const { id } = await context.params
    const existing = await prisma.unit.findUnique({ where: { id }, select: { subjectId: true } })
    if (!existing) return NextResponse.json({ error: "Ünite bulunamadı" }, { status: 404 })
    const plan = await guardSubjectPlan(guard.actor, existing.subjectId)
    if (!plan.ok) return plan.response
    await prisma.unit.delete({ where: { id } })
    return NextResponse.json({ message: "Ünite silindi" })
  } catch (error) {
    console.error("Error deleting unit:", error)
    return NextResponse.json({ error: "Ünite silinirken hata oluştu" }, { status: 500 })
  }
}
