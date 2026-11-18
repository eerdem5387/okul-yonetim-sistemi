import { NextRequest, NextResponse } from "next/server"
import type { Prisma, ProgressStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireNeredeyiz } from "@/lib/neredeyiz/access"
import { changeTopicProgress, PROGRESS_STATUSES } from "@/lib/neredeyiz/progress-service"
import { resolveNeredeyizYearId } from "@/lib/neredeyiz/year-scope"

// GET - İlerleme kayıtları (varsayılan: aktif akademik yıl)
export async function GET(request: NextRequest) {
  const guard = await requireNeredeyiz(request, "view")
  if (!guard.ok) return guard.response
  const actor = guard.actor
  try {
    const sp = request.nextUrl.searchParams
    const topicId = sp.get("topicId")
    const status = sp.get("status")
    const subjectId = sp.get("subjectId")
    const grade = sp.get("grade")
    const section = sp.get("section")
    const counselorId = sp.get("counselorId")
    const academicYearId = await resolveNeredeyizYearId(sp)

    const subjectWhere: Prisma.SubjectWhereInput = {}
    if (academicYearId && !topicId) subjectWhere.academicYearId = academicYearId
    if (subjectId) subjectWhere.id = subjectId
    if (grade && Number.isFinite(Number.parseInt(grade, 10))) subjectWhere.grade = Number.parseInt(grade, 10)
    if (section) subjectWhere.section = section
    if (counselorId) {
      // Rehber yalnız kendi sınıflarını; yönetim herhangi bir rehberin sınıflarını sorgulayabilir
      if (actor.isTeacher || (counselorId !== actor.staffId && (actor.department === "REHBERLIK"))) {
        return NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 })
      }
      subjectWhere.class = { counselorId }
    }
    if (actor.isTeacher && !actor.superAdmin) subjectWhere.assignments = { some: { staffId: actor.staffId } }

    const where: Prisma.ProgressWhereInput = { topic: { unit: { subject: subjectWhere } } }
    if (topicId) where.topicId = topicId
    if (status && PROGRESS_STATUSES.includes(status as ProgressStatus)) where.status = status as ProgressStatus

    const progress = await prisma.progress.findMany({
      where,
      include: { topic: { include: { unit: { include: { subject: true } } } } },
      orderBy: { updatedAt: "desc" },
    })

    const staffIds = new Set<string>()
    for (const p of progress) {
      if (p.markedBy) staffIds.add(p.markedBy)
      if (p.approvedBy) staffIds.add(p.approvedBy)
      if (p.reportedBy) staffIds.add(p.reportedBy)
    }
    const staff = staffIds.size
      ? await prisma.staff.findMany({
          where: { id: { in: [...staffIds] } },
          select: { id: true, firstName: true, lastName: true, department: true },
        })
      : []
    const staffMap = new Map(staff.map((s) => [s.id, s]))

    return NextResponse.json(
      progress.map((p) => ({
        ...p,
        markedByStaff: p.markedBy ? staffMap.get(p.markedBy) ?? null : null,
        approvedByStaff: p.approvedBy ? staffMap.get(p.approvedBy) ?? null : null,
        reportedByStaff: p.reportedBy ? staffMap.get(p.reportedBy) ?? null : null,
      })),
    )
  } catch (error) {
    console.error("Error fetching progress:", error)
    return NextResponse.json({ error: "İlerleme kayıtları getirilirken hata oluştu" }, { status: 500 })
  }
}

/**
 * POST - Konu ilerlemesini değiştir (konu başına tek kayıt; yoksa oluşturur).
 * Gövde: { topicId, status, actualStartDate?, actualEndDate?, notes? }
 * reportedBy / markedBy / approvedBy gövdeden okunmaz; oturumdaki kullanıcı yazılır.
 */
export async function POST(request: NextRequest) {
  const guard = await requireNeredeyiz(request, "view")
  if (!guard.ok) return guard.response
  try {
    const body = (await request.json()) as Record<string, unknown>
    const topicId = typeof body.topicId === "string" ? body.topicId : ""
    if (!topicId || !body.status) {
      return NextResponse.json({ error: "Konu ID ve durum zorunludur" }, { status: 400 })
    }
    const result = await changeTopicProgress(guard.actor, topicId, body)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json(result.data, { status: result.created ? 201 : 200 })
  } catch (error) {
    console.error("Error saving progress:", error)
    return NextResponse.json({ error: "İlerleme kaydı kaydedilirken hata oluştu" }, { status: 500 })
  }
}
