import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

/** Konu onayı kaldırıldı (haftalık takip onay gerektirmez): ilgili dersin konu geçmişine yönlendirir. */
export default async function LegacyOnayPage({ params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = await params
  const topic = await prisma.topic.findUnique({ where: { id: topicId }, select: { unit: { select: { subjectId: true } } } })
  redirect(topic ? `/neredeyiz/ders/${topic.unit.subjectId}` : "/neredeyiz")
}
