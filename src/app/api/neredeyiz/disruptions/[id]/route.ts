import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireNeredeyiz, requireNeredeyizManager } from "@/lib/neredeyiz/access"
import { parseDisruptionInput } from "@/lib/neredeyiz/calendar-input"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: Ctx) {
  const guard = await requireNeredeyiz(request, "view")
  if (!guard.ok) return guard.response
  try {
    const { id } = await context.params
    const disruption = await prisma.disruption.findUnique({
      where: { id },
      include: { academicYear: { select: { id: true, name: true } } },
    })
    if (!disruption) return NextResponse.json({ error: "Aksama bulunamadı" }, { status: 404 })
    return NextResponse.json(disruption)
  } catch (error) {
    console.error("Error fetching disruption:", error)
    return NextResponse.json({ error: "Aksama getirilirken hata oluştu" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, context: Ctx) {
  const guard = await requireNeredeyizManager(request, "edit")
  if (!guard.ok) return guard.response
  try {
    const { id } = await context.params
    const existing = await prisma.disruption.findUnique({ where: { id }, select: { academicYearId: true } })
    if (!existing) return NextResponse.json({ error: "Aksama bulunamadı" }, { status: 404 })
    const input = await parseDisruptionInput(existing.academicYearId, (await request.json()) as Record<string, unknown>)
    if (!input.ok) return NextResponse.json({ error: input.error }, { status: 400 })
    const disruption = await prisma.disruption.update({ where: { id }, data: input.data })
    return NextResponse.json(disruption)
  } catch (error) {
    console.error("Error updating disruption:", error)
    return NextResponse.json({ error: "Aksama güncellenirken hata oluştu" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: Ctx) {
  const guard = await requireNeredeyizManager(request, "delete")
  if (!guard.ok) return guard.response
  try {
    const { id } = await context.params
    const res = await prisma.disruption.deleteMany({ where: { id } })
    if (res.count === 0) return NextResponse.json({ error: "Aksama bulunamadı" }, { status: 404 })
    return NextResponse.json({ message: "Aksama silindi" })
  } catch (error) {
    console.error("Error deleting disruption:", error)
    return NextResponse.json({ error: "Aksama silinirken hata oluştu" }, { status: 500 })
  }
}
