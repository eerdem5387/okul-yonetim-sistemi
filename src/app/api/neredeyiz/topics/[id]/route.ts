import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireNeredeyiz } from "@/lib/neredeyiz/access"
import { badRequest, guardSubjectPlan, resolveTopicDates } from "@/lib/neredeyiz/plan-helpers"

type Ctx = { params: Promise<{ id: string }> }

// GET - Tek konu (+ ilerleme ve ilgili personel adları)
export async function GET(request: NextRequest, context: Ctx) {
  const guard = await requireNeredeyiz(request, "view")
  if (!guard.ok) return guard.response
  try {
    const { id } = await context.params
    const topic = await prisma.topic.findUnique({
      where: { id },
      include: {
        unit: {
          include: {
            subject: {
              include: {
                academicYear: { select: { id: true, name: true } },
                class: { select: { id: true, name: true, counselorId: true } },
              },
            },
          },
        },
        progress: true,
      },
    })
    if (!topic) return NextResponse.json({ error: "Konu bulunamadı" }, { status: 404 })

    const p = topic.progress[0]
    const ids = [p?.markedBy, p?.approvedBy, p?.reportedBy].filter((x): x is string => !!x)
    const staff = ids.length
      ? await prisma.staff.findMany({
          where: { id: { in: ids } },
          select: { id: true, firstName: true, lastName: true, department: true },
        })
      : []
    const map = new Map(staff.map((s) => [s.id, s]))

    return NextResponse.json({
      ...topic,
      progress: topic.progress.map((row) => ({
        ...row,
        markedByStaff: row.markedBy ? map.get(row.markedBy) ?? null : null,
        approvedByStaff: row.approvedBy ? map.get(row.approvedBy) ?? null : null,
        reportedByStaff: row.reportedBy ? map.get(row.reportedBy) ?? null : null,
      })),
    })
  } catch (error) {
    console.error("Error fetching topic:", error)
    return NextResponse.json({ error: "Konu getirilirken hata oluştu" }, { status: 500 })
  }
}

// PUT - Ad / açıklama / planlanan tarihler / sıra (sıra değişirse yer değiştirir)
export async function PUT(request: NextRequest, context: Ctx) {
  const guard = await requireNeredeyiz(request, "edit")
  if (!guard.ok) return guard.response
  try {
    const { id } = await context.params
    const existing = await prisma.topic.findUnique({ where: { id }, include: { unit: { select: { subjectId: true } } } })
    if (!existing) return NextResponse.json({ error: "Konu bulunamadı" }, { status: 404 })
    const plan = await guardSubjectPlan(guard.actor, existing.unit.subjectId)
    if (!plan.ok) return plan.response

    const body = (await request.json()) as Record<string, unknown>
    if (body.name !== undefined && !(typeof body.name === "string" && body.name.trim())) {
      return badRequest("Konu adı boş olamaz")
    }
    const dates = await resolveTopicDates(plan.subject, body.plannedStartDate, body.plannedEndDate, existing)
    if (!dates.ok) return badRequest(dates.error)
    const order = body.order !== undefined && Number.isFinite(Number(body.order)) ? Number(body.order) : undefined

    const topic = await prisma.$transaction(async (tx) => {
      if (order !== undefined && order !== existing.order) {
        const other = await tx.topic.findFirst({ where: { unitId: existing.unitId, order } })
        if (other) await tx.topic.update({ where: { id: other.id }, data: { order: existing.order } })
      }
      return tx.topic.update({
        where: { id },
        data: {
          ...(typeof body.name === "string" && { name: body.name.trim() }),
          ...(body.description !== undefined && {
            description: typeof body.description === "string" && body.description.trim() ? body.description.trim() : null,
          }),
          ...(dates.plannedStartDate !== undefined && { plannedStartDate: dates.plannedStartDate }),
          ...(dates.plannedEndDate !== undefined && { plannedEndDate: dates.plannedEndDate }),
          ...(order !== undefined && { order }),
        },
        include: { progress: true },
      })
    })
    return NextResponse.json({ ...topic, warning: dates.warning })
  } catch (error) {
    console.error("Error updating topic:", error)
    return NextResponse.json({ error: "Konu güncellenirken hata oluştu" }, { status: 500 })
  }
}

// DELETE - Konu ve ilerleme kaydı silinir
export async function DELETE(request: NextRequest, context: Ctx) {
  const guard = await requireNeredeyiz(request, "edit")
  if (!guard.ok) return guard.response
  try {
    const { id } = await context.params
    const existing = await prisma.topic.findUnique({ where: { id }, include: { unit: { select: { subjectId: true } } } })
    if (!existing) return NextResponse.json({ error: "Konu bulunamadı" }, { status: 404 })
    const plan = await guardSubjectPlan(guard.actor, existing.unit.subjectId)
    if (!plan.ok) return plan.response
    await prisma.topic.delete({ where: { id } })
    return NextResponse.json({ message: "Konu silindi" })
  } catch (error) {
    console.error("Error deleting topic:", error)
    return NextResponse.json({ error: "Konu silinirken hata oluştu" }, { status: 500 })
  }
}
