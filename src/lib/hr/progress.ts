import { prisma } from "@/lib/prisma"
import { getActiveAcademicYear } from "@/lib/activity-academic-year"

export interface SubjectProgressSummary {
  subjectId: string
  subjectName: string
  grade: number
  section: string | null
  className: string | null
  totalTopics: number
  completedTopics: number
  percentage: number
}

/**
 * Öğretmenin atandığı her ders için müfredat ilerleme yüzdesini döner.
 *
 * Hesaplama:
 *   - Subject -> Unit[] -> Topic[] zinciri ile toplam konu sayısı
 *   - Tamamlama kaydı (TopicCompletion) olan konu tamamlanmış sayılır
 *   - Yalnız aktif akademik yılın dersleri
 */
export async function getProgressSummaryForStaff(staffId: string): Promise<SubjectProgressSummary[]> {
  const active = await getActiveAcademicYear()
  const assignments = await prisma.subjectAssignment.findMany({
    where: { staffId, ...(active ? { subject: { academicYearId: active.id } } : {}) },
    include: {
      subject: {
        include: {
          class: { select: { name: true } },
          units: {
            include: {
              topics: { select: { completion: { select: { id: true } } } },
            },
          },
        },
      },
    },
  })

  return assignments.map((a) => {
    const topics = a.subject.units.flatMap((u) => u.topics)
    const total = topics.length
    const completed = topics.filter((t) => t.completion).length
    return {
      subjectId: a.subject.id,
      subjectName: a.subject.name,
      grade: a.subject.grade,
      section: a.subject.section,
      className: a.subject.class?.name ?? null,
      totalTopics: total,
      completedTopics: completed,
      percentage: total === 0 ? 0 : Math.round((completed / total) * 100),
    }
  })
}
