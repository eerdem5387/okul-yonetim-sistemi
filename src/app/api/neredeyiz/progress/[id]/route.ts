import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { canApproveForClass, canMarkTopicProgress, forbidden, loadTopicContext, requireNeredeyiz } from "@/lib/neredeyiz/access"
import { changeTopicProgress } from "@/lib/neredeyiz/progress-service"

type Ctx = { params: Promise<{ id: string }> }

// GET - Tek ilerleme kaydı
export async function GET(request: NextRequest, context: Ctx) {
  const guard = await requireNeredeyiz(request, "view")
  if (!guard.ok) return guard.response
  try {
    const { id } = await context.params
    const progress = await prisma.progress.findUnique({
      where: { id },
      include: { topic: { include: { unit: { include: { subject: true } } } } },
    })
    if (!progress) return NextResponse.json({ error: "İlerleme kaydı bulunamadı" }, { status: 404 })
    return NextResponse.json(progress)
  } catch (error) {
    console.error("Error fetching progress:", error)
    return NextResponse.json({ error: "İlerleme kaydı getirilirken hata oluştu" }, { status: 500 })
  }
}

// PUT - Durum değiştir (POST /api/neredeyiz/progress ile aynı kurallar)
export async function PUT(request: NextRequest, context: Ctx) {
  const guard = await requireNeredeyiz(request, "view")
  if (!guard.ok) return guard.response
  try {
    const { id } = await context.params
    const existing = await prisma.progress.findUnique({ where: { id }, select: { topicId: true } })
    if (!existing) return NextResponse.json({ error: "İlerleme kaydı bulunamadı" }, { status: 404 })
    const body = (await request.json()) as Record<string, unknown>
    if (!body.status) return NextResponse.json({ error: "Durum zorunludur" }, { status: 400 })
    const result = await changeTopicProgress(guard.actor, existing.topicId, body)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json(result.data)
  } catch (error) {
    console.error("Error updating progress:", error)
    return NextResponse.json({ error: "İlerleme kaydı güncellenirken hata oluştu" }, { status: 500 })
  }
}

// DELETE - Kaydı sil (konu "planlandı"ya döner). Onaylanmış kaydı yalnız onaylayıcı silebilir.
export async function DELETE(request: NextRequest, context: Ctx) {
  const guard = await requireNeredeyiz(request, "view")
  if (!guard.ok) return guard.response
  try {
    const { id } = await context.params
    const progress = await prisma.progress.findUnique({ where: { id } })
    if (!progress) return NextResponse.json({ error: "İlerleme kaydı bulunamadı" }, { status: 404 })
    const ctx = await loadTopicContext(progress.topicId)
    if (!ctx) return NextResponse.json({ error: "Konu bulunamadı" }, { status: 404 })
    const isApprover = await canApproveForClass(guard.actor, ctx.unit.subject.class?.counselorId)
    const isAssigned = await canMarkTopicProgress(guard.actor, ctx.unit.subject.id)
    if (!isApprover && !(isAssigned && progress.status !== "TAMAMLANDI")) return forbidden()
    await prisma.progress.delete({ where: { id } })
    return NextResponse.json({ message: "İlerleme kaydı silindi" })
  } catch (error) {
    console.error("Error deleting progress:", error)
    return NextResponse.json({ error: "İlerleme kaydı silinirken hata oluştu" }, { status: 500 })
  }
}
