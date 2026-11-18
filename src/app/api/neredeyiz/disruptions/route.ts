import { NextRequest, NextResponse } from "next/server"
import { DisruptionType, type Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireNeredeyiz, requireNeredeyizManager } from "@/lib/neredeyiz/access"
import { parseDisruptionInput } from "@/lib/neredeyiz/calendar-input"
import { notify } from "@/lib/neredeyiz/progress-service"
import { resolveNeredeyizYearId } from "@/lib/neredeyiz/year-scope"

// GET - Aksamalar (varsayılan: aktif akademik yıl)
export async function GET(request: NextRequest) {
  const guard = await requireNeredeyiz(request, "view")
  if (!guard.ok) return guard.response
  try {
    const sp = request.nextUrl.searchParams
    const academicYearId = await resolveNeredeyizYearId(sp)
    const type = sp.get("type")
    const where: Prisma.DisruptionWhereInput = {}
    if (academicYearId) where.academicYearId = academicYearId
    if (type && (Object.values(DisruptionType) as string[]).includes(type)) where.type = type as DisruptionType
    const disruptions = await prisma.disruption.findMany({
      where,
      include: { academicYear: { select: { id: true, name: true } } },
      orderBy: { startDate: "desc" },
    })
    return NextResponse.json(disruptions)
  } catch (error) {
    console.error("Error fetching disruptions:", error)
    return NextResponse.json({ error: "Aksamalar getirilirken hata oluştu" }, { status: 500 })
  }
}

// POST - Aksama ekle. Tarihler yıl içinde olmalı; kapsamdaki ders/sınıflar o yıla ait olmalı.
export async function POST(request: NextRequest) {
  const guard = await requireNeredeyizManager(request, "create")
  if (!guard.ok) return guard.response
  try {
    const body = (await request.json()) as Record<string, unknown>
    const academicYearId = typeof body.academicYearId === "string" ? body.academicYearId : ""
    if (!academicYearId) return NextResponse.json({ error: "Akademik yıl zorunludur" }, { status: 400 })
    const year = await prisma.academicYear.findUnique({ where: { id: academicYearId }, select: { id: true } })
    if (!year) return NextResponse.json({ error: "Akademik yıl bulunamadı" }, { status: 404 })

    const input = await parseDisruptionInput(academicYearId, body)
    if (!input.ok) return NextResponse.json({ error: input.error }, { status: 400 })

    const disruption = await prisma.disruption.create({
      data: { academicYearId, ...input.data, createdBy: guard.actor.staffId },
    })

    // Etkilenen öğretmenlere bilgi
    const staffIds = new Set<string>(input.data.affectedStaffIds)
    if (input.data.scope === "SUBJECTS" || input.data.scope === "CLASSES") {
      const rows = await prisma.subjectAssignment.findMany({
        where:
          input.data.scope === "SUBJECTS"
            ? { subjectId: { in: input.data.affectedSubjects } }
            : { subject: { classId: { in: input.data.affectedClassIds } } },
        select: { staffId: true },
      })
      rows.forEach((r) => staffIds.add(r.staffId))
    }
    const message = `${input.data.reason} (${input.data.startDate.toLocaleDateString("tr-TR")} – ${input.data.endDate.toLocaleDateString("tr-TR")}). Bu günler gecikme hesabına katılmaz.`
    if (input.data.scope === "SCHOOL") {
      await notify({ type: "AKSAMA_OLUSTURULDU", title: "Okul geneli aksama", message, targetRole: "OGRETMEN" })
    } else {
      for (const id of staffIds) {
        await notify({ type: "AKSAMA_OLUSTURULDU", title: "Derslerinizi etkileyen aksama", message, targetUserId: id })
      }
    }

    return NextResponse.json(disruption, { status: 201 })
  } catch (error) {
    console.error("Error creating disruption:", error)
    return NextResponse.json({ error: "Aksama oluşturulurken hata oluştu" }, { status: 500 })
  }
}
