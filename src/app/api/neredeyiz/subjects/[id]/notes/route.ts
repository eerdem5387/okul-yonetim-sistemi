import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { forbidden, requireNeredeyiz } from "@/lib/neredeyiz/access"
import { notifyStaff } from "@/lib/neredeyiz/notify"
import { classLabel } from "@/lib/neredeyiz/teacher-view"

/** POST — Rehberlik/yönetim notu. Gövde: { text, topicId? }. Dersin öğretmenlerine bildirilir. */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const guard = await requireNeredeyiz(request, "view")
  if (!guard.ok) return guard.response
  if (guard.actor.isTeacher && !guard.actor.superAdmin) return forbidden("Notları rehberlik ve yönetim yazar.")
  try {
    const { id } = await context.params
    const body = (await request.json().catch(() => ({}))) as { text?: string; topicId?: string }
    const text = body.text?.trim()
    if (!text) return NextResponse.json({ error: "Not boş olamaz" }, { status: 400 })
    const subject = await prisma.subject.findUnique({
      where: { id },
      select: { id: true, name: true, grade: true, section: true, class: { select: { name: true } }, assignments: { select: { staffId: true } } },
    })
    if (!subject) return NextResponse.json({ error: "Ders bulunamadı" }, { status: 404 })
    let topicName: string | null = null
    if (body.topicId) {
      const topic = await prisma.topic.findFirst({ where: { id: body.topicId, unit: { subjectId: id } }, select: { name: true } })
      if (!topic) return NextResponse.json({ error: "Konu bu derse ait değil" }, { status: 400 })
      topicName = topic.name
    }
    const note = await prisma.neredeyizNote.create({
      data: { subjectId: id, topicId: body.topicId || null, authorId: guard.actor.staffId, text: text.slice(0, 1000) },
    })
    await notifyStaff({
      staffIds: subject.assignments.map((a) => a.staffId),
      type: "REHBERLIK_NOTU",
      title: `${classLabel(subject)} ${subject.name}: rehberlik notu`,
      message: `${topicName ? `${topicName} — ` : ""}${text}`,
      relatedSubjectId: id,
      relatedTopicId: body.topicId || null,
      relatedStaffId: guard.actor.staffId,
      push: { kind: "neredeyiz_note", href: `/ogretmen/neredeyiz?tab=plan&subjectId=${id}` },
    })
    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    console.error("note", error)
    return NextResponse.json({ error: "Not kaydedilemedi" }, { status: 500 })
  }
}
