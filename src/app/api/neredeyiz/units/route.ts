import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireNeredeyiz } from "@/lib/neredeyiz/access"
import { badRequest, guardSubjectPlan } from "@/lib/neredeyiz/plan-helpers"

// GET - Bir dersin üniteleri
export async function GET(request: NextRequest) {
  const guard = await requireNeredeyiz(request, "view")
  if (!guard.ok) return guard.response
  try {
    const subjectId = request.nextUrl.searchParams.get("subjectId")
    if (!subjectId) return badRequest("Ders ID zorunludur")
    const units = await prisma.unit.findMany({
      where: { subjectId },
      include: { topics: { orderBy: { order: "asc" }, include: { progress: true } } },
      orderBy: { order: "asc" },
    })
    return NextResponse.json(units)
  } catch (error) {
    console.error("Error fetching units:", error)
    return NextResponse.json({ error: "Üniteler getirilirken hata oluştu" }, { status: 500 })
  }
}

// POST - Yeni ünite (sıra verilmezse sona eklenir)
export async function POST(request: NextRequest) {
  const guard = await requireNeredeyiz(request, "create")
  if (!guard.ok) return guard.response
  try {
    const body = (await request.json()) as { subjectId?: string; name?: string; order?: unknown; description?: string }
    const name = body.name?.trim()
    if (!body.subjectId || !name) return badRequest("Ders ve ünite adı zorunludur")
    const plan = await guardSubjectPlan(guard.actor, body.subjectId)
    if (!plan.ok) return plan.response

    const last = await prisma.unit.findFirst({ where: { subjectId: body.subjectId }, orderBy: { order: "desc" }, select: { order: true } })
    const order = Number.isFinite(Number(body.order)) ? Number(body.order) : (last?.order ?? 0) + 1
    const unit = await prisma.unit.create({
      data: { subjectId: body.subjectId, name, order, description: body.description?.trim() || null },
    })
    return NextResponse.json(unit, { status: 201 })
  } catch (error) {
    console.error("Error creating unit:", error)
    return NextResponse.json({ error: "Ünite oluşturulurken hata oluştu" }, { status: 500 })
  }
}
