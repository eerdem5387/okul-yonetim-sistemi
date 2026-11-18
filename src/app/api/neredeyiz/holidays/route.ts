import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSettingsEdit, requireStaff } from "@/lib/neredeyiz/access"
import { parseHolidayInput } from "@/lib/neredeyiz/calendar-input"
import { resolveNeredeyizYearId } from "@/lib/neredeyiz/year-scope"

// GET - Tatiller (varsayılan: aktif akademik yıl). Okul takvimi her personele açıktır.
export async function GET(request: NextRequest) {
  const guard = await requireStaff(request)
  if (!guard.ok) return guard.response
  try {
    const academicYearId = await resolveNeredeyizYearId(request.nextUrl.searchParams)
    if (!academicYearId) return NextResponse.json([])
    const holidays = await prisma.holiday.findMany({ where: { academicYearId }, orderBy: { startDate: "asc" } })
    return NextResponse.json(holidays)
  } catch (error) {
    console.error("Error fetching holidays:", error)
    return NextResponse.json({ error: "Tatiller getirilirken hata oluştu" }, { status: 500 })
  }
}

// POST - Tatil ekle (Ayarlar düzenleme yetkisi). Tarihler yıl içinde olmalı.
export async function POST(request: NextRequest) {
  const guard = await requireSettingsEdit(request)
  if (!guard.ok) return guard.response
  try {
    const body = (await request.json()) as Record<string, unknown>
    const academicYearId = typeof body.academicYearId === "string" ? body.academicYearId : ""
    if (!academicYearId) return NextResponse.json({ error: "Akademik yıl zorunludur" }, { status: 400 })
    const year = await prisma.academicYear.findUnique({ where: { id: academicYearId }, select: { id: true } })
    if (!year) return NextResponse.json({ error: "Akademik yıl bulunamadı" }, { status: 404 })
    const input = await parseHolidayInput(academicYearId, body)
    if (!input.ok) return NextResponse.json({ error: input.error }, { status: 400 })
    const holiday = await prisma.holiday.create({ data: { academicYearId, ...input.data } })
    return NextResponse.json(holiday, { status: 201 })
  } catch (error) {
    console.error("Error creating holiday:", error)
    return NextResponse.json({ error: "Tatil oluşturulurken hata oluştu" }, { status: 500 })
  }
}
