import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireNeredeyiz } from "@/lib/neredeyiz/access"
import { badRequest, guardSubjectPlan, resolveTopicWeeks } from "@/lib/neredeyiz/plan-helpers"

// GET - Bir ünitenin konuları
export async function GET(request: NextRequest) {
  const guard = await requireNeredeyiz(request, "view")
  if (!guard.ok) return guard.response
  try {
    const unitId = request.nextUrl.searchParams.get("unitId")
    if (!unitId) return badRequest("Ünite ID zorunludur")
    const topics = await prisma.topic.findMany({
      where: { unitId },
      include: { completion: true },
      orderBy: { order: "asc" },
    })
    return NextResponse.json(topics)
  } catch (error) {
    console.error("Error fetching topics:", error)
    return NextResponse.json({ error: "Konular getirilirken hata oluştu" }, { status: 500 })
  }
}

// POST - Yeni konu. Gövde: { unitId, name, plannedStartWeek?, plannedEndWeek?, order? }
export async function POST(request: NextRequest) {
  const guard = await requireNeredeyiz(request, "create")
  if (!guard.ok) return guard.response
  try {
    const body = (await request.json()) as Record<string, unknown>
    const unitId = typeof body.unitId === "string" ? body.unitId : ""
    const name = typeof body.name === "string" ? body.name.trim() : ""
    if (!unitId || !name) return badRequest("Ünite ve konu adı zorunludur")
    const unit = await prisma.unit.findUnique({ where: { id: unitId }, select: { subjectId: true } })
    if (!unit) return NextResponse.json({ error: "Ünite bulunamadı" }, { status: 404 })
    const plan = await guardSubjectPlan(guard.actor, unit.subjectId)
    if (!plan.ok) return plan.response

    const weeks = await resolveTopicWeeks(plan.subject.academicYearId, body.plannedStartWeek, body.plannedEndWeek)
    if (!weeks.ok) return badRequest(weeks.error)

    const last = await prisma.topic.findFirst({ where: { unitId }, orderBy: { order: "desc" }, select: { order: true } })
    const order = Number.isFinite(Number(body.order)) ? Number(body.order) : (last?.order ?? 0) + 1
    const topic = await prisma.topic.create({
      data: {
        unitId,
        name,
        order,
        plannedStartWeek: weeks.plannedStartWeek ?? null,
        plannedEndWeek: weeks.plannedEndWeek ?? null,
        description: typeof body.description === "string" && body.description.trim() ? body.description.trim() : null,
      },
    })
    return NextResponse.json(topic, { status: 201 })
  } catch (error) {
    console.error("Error creating topic:", error)
    return NextResponse.json({ error: "Konu oluşturulurken hata oluştu" }, { status: 500 })
  }
}
