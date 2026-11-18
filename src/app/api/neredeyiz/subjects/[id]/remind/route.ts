import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { forbidden, requireNeredeyiz } from "@/lib/neredeyiz/access"
import { notifyStaff } from "@/lib/neredeyiz/notify"
import { classLabel, evaluateSubjectTopics, loadTeacherSubjects, teacherYearContext } from "@/lib/neredeyiz/teacher-view"

/** POST — Dersin öğretmenlerine geciken konuları hatırlat (aynı ders için günde bir kez). */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const guard = await requireNeredeyiz(request, "view")
  if (!guard.ok) return guard.response
  if (guard.actor.isTeacher && !guard.actor.superAdmin) return forbidden()
  try {
    const { id } = await context.params
    const base = await prisma.subject.findUnique({
      where: { id },
      select: { academicYearId: true, assignments: { select: { staffId: true } } },
    })
    if (!base) return NextResponse.json({ error: "Ders bulunamadı" }, { status: 404 })
    const teacherIds = base.assignments.map((a) => a.staffId)
    if (!teacherIds.length) return NextResponse.json({ error: "Bu derse atanmış öğretmen yok" }, { status: 400 })

    const recent = await prisma.notification.findFirst({
      where: { type: "HATIRLATMA", relatedSubjectId: id, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      select: { createdAt: true },
    })
    if (recent) return NextResponse.json({ ok: true, alreadyReminded: true, remindedAt: recent.createdAt.toISOString() })

    const [subject] = await loadTeacherSubjects(teacherIds[0]!, base.academicYearId, id)
    if (!subject) return NextResponse.json({ error: "Ders bulunamadı" }, { status: 404 })
    const ctx = await teacherYearContext(base.academicYearId)
    const late = evaluateSubjectTopics(subject, ctx).filter((r) => r.ev.state === "GECIKTI")
    if (!late.length) return NextResponse.json({ error: "Bu derste geciken konu yok" }, { status: 400 })

    await notifyStaff({
      staffIds: teacherIds,
      type: "HATIRLATMA",
      priority: "HIGH",
      title: `${classLabel(subject)} ${subject.name}: ${late.length} konu gecikti`,
      message: late.map((r) => `${r.topic.name} (${r.ev.rangeLabel})`).join(", ") + ". İşlediyseniz Tamamlandı olarak işaretleyin.",
      relatedSubjectId: id,
      relatedStaffId: guard.actor.staffId,
      push: { kind: "neredeyiz_reminder", href: "/ogretmen/neredeyiz" },
    })
    return NextResponse.json({ ok: true, remindedAt: new Date().toISOString() })
  } catch (error) {
    console.error("remind", error)
    return NextResponse.json({ error: "Hatırlatma gönderilemedi" }, { status: 500 })
  }
}
