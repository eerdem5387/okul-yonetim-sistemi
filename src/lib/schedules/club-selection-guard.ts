import { prisma } from "@/lib/prisma"

/** Kulüp seçimi yapmış öğrenciler ÖÇG'ye atanamaz. */
export async function assertStudentsWithoutClubSelection(
  studentIds: string[]
): Promise<string | null> {
  if (studentIds.length === 0) return null

  const selections = await prisma.clubSelection.findMany({
    where: { studentId: { in: studentIds } },
    select: {
      student: { select: { firstName: true, lastName: true } },
      club: { select: { name: true } },
    },
  })

  if (selections.length === 0) return null

  const byStudent = new Map<string, string[]>()
  for (const row of selections) {
    const name = `${row.student.firstName} ${row.student.lastName}`
    const clubs = byStudent.get(name) ?? []
    clubs.push(row.club.name)
    byStudent.set(name, clubs)
  }

  const info = [...byStudent.entries()]
    .map(([name, clubs]) => `${name} (${[...new Set(clubs)].join(", ")})`)
    .join("; ")

  return `Kulüp seçimi yapmış öğrenciler özel çalışma grubuna atanamaz: ${info}`
}
