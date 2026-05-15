import { prisma } from "@/lib/prisma"

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
 *   - Her Topic için en güncel Progress kaydı TAMAMLANDI ise tamamlanmış sayılır
 *   (Topic-Progress arası 1-N olduğundan en son `updatedAt` baz alınır.)
 */
export async function getProgressSummaryForStaff(staffId: string): Promise<SubjectProgressSummary[]> {
  const assignments = await prisma.subjectAssignment.findMany({
    where: { staffId },
    include: {
      subject: {
        include: {
          class: { select: { name: true } },
          units: {
            include: {
              topics: {
                include: {
                  progress: {
                    orderBy: { updatedAt: "desc" },
                    take: 1,
                    select: { status: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  return assignments.map((a) => {
    const topics = a.subject.units.flatMap((u) => u.topics)
    const total = topics.length
    const completed = topics.filter((t) => t.progress[0]?.status === "TAMAMLANDI").length
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
