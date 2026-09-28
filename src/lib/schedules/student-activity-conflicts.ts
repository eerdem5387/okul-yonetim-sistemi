import { prisma } from "@/lib/prisma"
import { DAY_LABELS, hasTimeConflict } from "@/lib/schedules/time-conflict"

export type ConflictAssignmentKind = "CLUB" | "STUDY_GROUP"

export type ConflictAssignment = {
  key: string
  kind: ConflictAssignmentKind
  /** ClubSchedule.id veya StudyGroupSession.id */
  scheduleOrSessionId: string
  clubId: string | null
  clubGroupId: string | null
  studyGroupId: string | null
  label: string
  dayOfWeek: number
  startTime: string
  endTime: string
  teacherName: string | null
}

export type StudentConflictRow = {
  studentId: string
  firstName: string
  lastName: string
  grade: string
  dayOfWeek: number
  dayLabel: string
  /** Bu çakışma kümesindeki zaman aralığı özeti */
  timeLabel: string
  assignments: ConflictAssignment[]
}

type FlatEntry = ConflictAssignment & {
  studentId: string
  firstName: string
  lastName: string
  grade: string
}

function assignmentKey(a: {
  kind: ConflictAssignmentKind
  scheduleOrSessionId: string
}): string {
  return `${a.kind}:${a.scheduleOrSessionId}`
}

/** Kulüp programı + ÖÇG oturumları arasında öğrenci zaman çakışmaları */
export async function findStudentActivityConflicts(): Promise<StudentConflictRow[]> {
  const [clubSchedules, studySessions] = await Promise.all([
    prisma.clubSchedule.findMany({
      where: { isActive: true },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            instructor: { select: { firstName: true, lastName: true } },
            selections: {
              select: {
                student: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    grade: true,
                  },
                },
              },
            },
          },
        },
        clubGroup: {
          select: {
            id: true,
            name: true,
            students: {
              select: {
                student: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    grade: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.studyGroupSession.findMany({
      where: { isActive: true },
      include: {
        teacher: { select: { firstName: true, lastName: true } },
        studyGroup: {
          select: {
            id: true,
            name: true,
            students: {
              select: {
                student: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    grade: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
  ])

  const entries: FlatEntry[] = []

  for (const s of clubSchedules) {
    const students = s.clubGroup
      ? s.clubGroup.students.map((m) => m.student)
      : s.club.selections.map((m) => m.student)
    const teacherName = s.club.instructor
      ? `${s.club.instructor.firstName} ${s.club.instructor.lastName}`
      : null
    const label = s.clubGroup
      ? `Kulüp · ${s.club.name} / ${s.clubGroup.name}`
      : `Kulüp · ${s.club.name}`
    const base = {
      kind: "CLUB" as const,
      scheduleOrSessionId: s.id,
      clubId: s.clubId,
      clubGroupId: s.clubGroupId,
      studyGroupId: null as string | null,
      label,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      teacherName,
    }
    for (const st of students) {
      entries.push({
        ...base,
        key: assignmentKey(base),
        studentId: st.id,
        firstName: st.firstName,
        lastName: st.lastName,
        grade: st.grade,
      })
    }
  }

  for (const s of studySessions) {
    const teacherName = `${s.teacher.firstName} ${s.teacher.lastName}`
    const label = `ÖÇG · ${s.studyGroup.name}${s.topic ? ` · ${s.topic}` : ""}`
    const base = {
      kind: "STUDY_GROUP" as const,
      scheduleOrSessionId: s.id,
      clubId: null as string | null,
      clubGroupId: null as string | null,
      studyGroupId: s.studyGroupId,
      label,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      teacherName,
    }
    for (const m of s.studyGroup.students) {
      const st = m.student
      entries.push({
        ...base,
        key: assignmentKey(base),
        studentId: st.id,
        firstName: st.firstName,
        lastName: st.lastName,
        grade: st.grade,
      })
    }
  }

  // studentId + day → entries
  const byStudentDay = new Map<string, FlatEntry[]>()
  for (const e of entries) {
    const k = `${e.studentId}|${e.dayOfWeek}`
    const list = byStudentDay.get(k) ?? []
    list.push(e)
    byStudentDay.set(k, list)
  }

  const conflicts: StudentConflictRow[] = []

  for (const list of byStudentDay.values()) {
    if (list.length < 2) continue

    // Connected components of overlapping assignments
    const n = list.length
    const parent = list.map((_, i) => i)
    const find = (i: number): number => {
      if (parent[i] !== i) parent[i] = find(parent[i])
      return parent[i]
    }
    const union = (i: number, j: number) => {
      const a = find(i)
      const b = find(j)
      if (a !== b) parent[a] = b
    }

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (
          hasTimeConflict(
            list[i].startTime,
            list[i].endTime,
            list[j].startTime,
            list[j].endTime
          )
        ) {
          union(i, j)
        }
      }
    }

    const clusters = new Map<number, FlatEntry[]>()
    for (let i = 0; i < n; i++) {
      const root = find(i)
      const c = clusters.get(root) ?? []
      c.push(list[i])
      clusters.set(root, c)
    }

    for (const cluster of clusters.values()) {
      // Unique assignments in cluster
      const unique = new Map<string, ConflictAssignment>()
      for (const e of cluster) {
        if (!unique.has(e.key)) {
          unique.set(e.key, {
            key: e.key,
            kind: e.kind,
            scheduleOrSessionId: e.scheduleOrSessionId,
            clubId: e.clubId,
            clubGroupId: e.clubGroupId,
            studyGroupId: e.studyGroupId,
            label: e.label,
            dayOfWeek: e.dayOfWeek,
            startTime: e.startTime,
            endTime: e.endTime,
            teacherName: e.teacherName,
          })
        }
      }
      const assignments = [...unique.values()].sort((a, b) =>
        a.startTime.localeCompare(b.startTime)
      )
      if (assignments.length < 2) continue

      const first = cluster[0]
      const starts = assignments.map((a) => a.startTime).sort()
      const ends = assignments.map((a) => a.endTime).sort()
      conflicts.push({
        studentId: first.studentId,
        firstName: first.firstName,
        lastName: first.lastName,
        grade: first.grade,
        dayOfWeek: first.dayOfWeek,
        dayLabel: DAY_LABELS[first.dayOfWeek] || String(first.dayOfWeek),
        timeLabel: `${starts[0]}–${ends[ends.length - 1]}`,
        assignments,
      })
    }
  }

  conflicts.sort((a, b) => {
    const name = `${a.lastName} ${a.firstName}`.localeCompare(
      `${b.lastName} ${b.firstName}`,
      "tr"
    )
    if (name !== 0) return name
    return a.dayOfWeek - b.dayOfWeek || a.timeLabel.localeCompare(b.timeLabel)
  })

  return conflicts
}

/** Öğrenciyi tutulan atama dışındaki çakışan gruplardan çıkarır */
export async function resolveStudentConflict(options: {
  studentId: string
  keepKey: string
  removeKeys: string[]
}): Promise<{ removed: string[]; errors: string[] }> {
  const { studentId, keepKey, removeKeys } = options
  const removed: string[] = []
  const errors: string[] = []

  for (const key of removeKeys) {
    if (key === keepKey) continue
    const [kind, id] = key.split(":")
    if (!kind || !id) {
      errors.push(`Geçersiz anahtar: ${key}`)
      continue
    }

    if (kind === "CLUB") {
      const schedule = await prisma.clubSchedule.findUnique({
        where: { id },
        select: { clubGroupId: true, clubId: true, club: { select: { name: true } } },
      })
      if (!schedule) {
        errors.push(`Kulüp programı bulunamadı: ${id}`)
        continue
      }
      if (schedule.clubGroupId) {
        const del = await prisma.clubGroupStudent.deleteMany({
          where: { clubGroupId: schedule.clubGroupId, studentId },
        })
        if (del.count > 0) {
          removed.push(`Kulüp grubundan çıkarıldı (${schedule.club.name})`)
        } else {
          errors.push(`${schedule.club.name}: öğrenci bu grupta değil`)
        }
      } else {
        // Grup yoksa kulüp seçiminden çıkar
        const del = await prisma.clubSelection.deleteMany({
          where: { clubId: schedule.clubId, studentId },
        })
        if (del.count > 0) {
          removed.push(`Kulüp seçiminden çıkarıldı (${schedule.club.name})`)
        } else {
          errors.push(`${schedule.club.name}: seçim kaydı yok`)
        }
      }
    } else if (kind === "STUDY_GROUP") {
      const session = await prisma.studyGroupSession.findUnique({
        where: { id },
        select: {
          studyGroupId: true,
          studyGroup: { select: { name: true } },
        },
      })
      if (!session) {
        errors.push(`ÖÇG oturumu bulunamadı: ${id}`)
        continue
      }
      const del = await prisma.studyGroupStudent.deleteMany({
        where: { studyGroupId: session.studyGroupId, studentId },
      })
      if (del.count > 0) {
        removed.push(`ÖÇG grubundan çıkarıldı (${session.studyGroup.name})`)
      } else {
        errors.push(`${session.studyGroup.name}: öğrenci bu grupta değil`)
      }
    } else {
      errors.push(`Bilinmeyen tür: ${kind}`)
    }
  }

  return { removed, errors }
}
