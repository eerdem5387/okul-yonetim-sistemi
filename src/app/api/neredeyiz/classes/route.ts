import { NextRequest, NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireNeredeyiz } from "@/lib/neredeyiz/access"
import { resolveNeredeyizYearId } from "@/lib/neredeyiz/year-scope"

/**
 * Neredeyiz sınıf planı listesi (varsayılan: aktif akademik yıl; ?academicYearId= ile geçmiş yıllar).
 * Öğretmen yalnız dersine girdiği sınıfları görür.
 */
export async function GET(request: NextRequest) {
  const guard = await requireNeredeyiz(request, "view")
  if (!guard.ok) return guard.response
  const actor = guard.actor
  try {
    const academicYearId = await resolveNeredeyizYearId(request.nextUrl.searchParams)
    const where: Prisma.ClassWhereInput = {}
    if (academicYearId) where.academicYearId = academicYearId
    if (actor.isTeacher && !actor.superAdmin) {
      where.subjects = { some: { assignments: { some: { staffId: actor.staffId } } } }
    }
    const classes = await prisma.class.findMany({
      where,
      orderBy: [{ grade: "asc" }, { section: "asc" }],
      select: {
        id: true,
        name: true,
        grade: true,
        section: true,
        academicYearId: true,
        academicYear: { select: { id: true, name: true, isActive: true } },
        counselor: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { subjects: true, schedules: true } },
      },
    })
    const topicCounts = await prisma.topic.groupBy({
      by: ["unitId"],
      where: { unit: { subject: { classId: { in: classes.map((c) => c.id) } } } },
      _count: { _all: true },
    })
    const units = topicCounts.length
      ? await prisma.unit.findMany({
          where: { id: { in: topicCounts.map((t) => t.unitId) } },
          select: { id: true, subject: { select: { classId: true } } },
        })
      : []
    const unitClass = new Map(units.map((u) => [u.id, u.subject.classId]))
    const perClass = new Map<string, number>()
    for (const t of topicCounts) {
      const cid = unitClass.get(t.unitId)
      if (cid) perClass.set(cid, (perClass.get(cid) ?? 0) + t._count._all)
    }
    return NextResponse.json({
      academicYearId,
      classes: classes.map((c) => ({ ...c, topicCount: perClass.get(c.id) ?? 0 })),
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Sınıflar yüklenemedi" }, { status: 500 })
  }
}
