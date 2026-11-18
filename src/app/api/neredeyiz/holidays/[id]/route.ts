import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSettingsEdit, requireStaff } from "@/lib/neredeyiz/access"
import { parseHolidayInput } from "@/lib/neredeyiz/calendar-input"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: Ctx) {
  const guard = await requireStaff(request)
  if (!guard.ok) return guard.response
  try {
    const { id } = await context.params
    const holiday = await prisma.holiday.findUnique({ where: { id } })
    if (!holiday) return NextResponse.json({ error: "Tatil bulunamadı" }, { status: 404 })
    return NextResponse.json(holiday)
  } catch (error) {
    console.error("Error fetching holiday:", error)
    return NextResponse.json({ error: "Tatil getirilirken hata oluştu" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, context: Ctx) {
  const guard = await requireSettingsEdit(request)
  if (!guard.ok) return guard.response
  try {
    const { id } = await context.params
    const existing = await prisma.holiday.findUnique({ where: { id }, select: { academicYearId: true } })
    if (!existing) return NextResponse.json({ error: "Tatil bulunamadı" }, { status: 404 })
    const input = await parseHolidayInput(existing.academicYearId, (await request.json()) as Record<string, unknown>)
    if (!input.ok) return NextResponse.json({ error: input.error }, { status: 400 })
    const holiday = await prisma.holiday.update({ where: { id }, data: input.data })
    return NextResponse.json(holiday)
  } catch (error) {
    console.error("Error updating holiday:", error)
    return NextResponse.json({ error: "Tatil güncellenirken hata oluştu" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: Ctx) {
  const guard = await requireSettingsEdit(request)
  if (!guard.ok) return guard.response
  try {
    const { id } = await context.params
    const res = await prisma.holiday.deleteMany({ where: { id } })
    if (res.count === 0) return NextResponse.json({ error: "Tatil bulunamadı" }, { status: 404 })
    return NextResponse.json({ message: "Tatil silindi" })
  } catch (error) {
    console.error("Error deleting holiday:", error)
    return NextResponse.json({ error: "Tatil silinirken hata oluştu" }, { status: 500 })
  }
}
