import { prisma } from "@/lib/prisma"
import { excludeStudentFromClubSchedule } from "@/lib/schedules/club-schedule-exclusions"
import { DAY_LABELS, hasTimeConflict } from "@/lib/schedules/time-conflict"
import { parseStudentGradeLevel } from "@/lib/student-grade-level"

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
  dayLabel: string
  startTime: string
  endTime: string
  teacherName: string | null
  /**
   * Kulüp: bu saatten muaf tutma mümkün (grup üyeliği kalır).
   * true ise UI “Bu günden çıkar” gösterir.
   */
  canExcludeDay: boolean
  /** Aynı grubun/kulübün diğer aktif günleri — muaf sonrası bunlar devam eder */
  otherDaysKeep: string[]
}

export type StudentConflictCluster = {
  dayOfWeek: number
  dayLabel: string
  timeLabel: string
  assignments: ConflictAssignment[]
}

export type ClubApplication = {
  clubId: string
  clubName: string
}

export type SafeClubOption = {
  clubId: string
  clubName: string
  clubGroupId: string
  clubGroupName: string
  teacherName: string | null
  memberCount: number
  schedules: Array<{
    dayOfWeek: number
    dayLabel: string
    startTime: string
    endTime: string
  }>
}

export type StudentConflictDetail = {
  studentId: string
  firstName: string
  lastName: string
  grade: string
  gradeLevel: number | null
  applications: ClubApplication[]
  clusters: StudentConflictCluster[]
  /** Çakışan atamaların düz listesi (Çıkar butonları için) */
  conflictingAssignments: ConflictAssignment[]
  /** Başvurularından, mevcut çakışmasız programla uyumlu kulüp grupları */
  safeAlternatives: SafeClubOption[]
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

type TimeBlock = { dayOfWeek: number; startTime: string; endTime: string }

function blocksConflict(a: TimeBlock, b: TimeBlock) {
  return a.dayOfWeek === b.dayOfWeek && hasTimeConflict(a.startTime, a.endTime, b.startTime, b.endTime)
}

/** Kulüp programı + ÖÇG oturumları arasında öğrenci zaman çakışmaları (eski satır formatı) */
export async function findStudentActivityConflicts(): Promise<
  Array<{
    studentId: string
    firstName: string
    lastName: string
    grade: string
    dayOfWeek: number
    dayLabel: string
    timeLabel: string
    assignments: ConflictAssignment[]
  }>
> {
  const details = await findStudentConflictDetails()
  const rows: Array<{
    studentId: string
    firstName: string
    lastName: string
    grade: string
    dayOfWeek: number
    dayLabel: string
    timeLabel: string
    assignments: ConflictAssignment[]
  }> = []
  for (const d of details) {
    for (const c of d.clusters) {
      rows.push({
        studentId: d.studentId,
        firstName: d.firstName,
        lastName: d.lastName,
        grade: d.grade,
        dayOfWeek: c.dayOfWeek,
        dayLabel: c.dayLabel,
        timeLabel: c.timeLabel,
        assignments: c.assignments,
      })
    }
  }
  return rows
}

function formatDayKeep(s: {
  dayOfWeek: number
  startTime: string
  endTime: string
}): string {
  const day = DAY_LABELS[s.dayOfWeek] || `Gün ${s.dayOfWeek}`
  return `${day} ${s.startTime}–${s.endTime}`
}

/** Öğrenci merkezli çakışma detayı: başvurular, çakışanlar, güvenli alternatifler */
export async function findStudentConflictDetails(): Promise<StudentConflictDetail[]> {
  const [clubSchedules, studySessions, exclusions] = await Promise.all([
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
    prisma.clubScheduleExclusion.findMany({
      select: { clubScheduleId: true, studentId: true },
    }),
  ])

  const excludedPairs = new Set(
    exclusions.map((e) => `${e.clubScheduleId}:${e.studentId}`)
  )

  // Aynı grup (veya grupsuz kulüp) için kardeş günler
  const siblingsBySchedule = new Map<string, string[]>()
  for (const s of clubSchedules) {
    const others = clubSchedules
      .filter((o) => {
        if (o.id === s.id || !o.isActive) return false
        if (s.clubGroupId) return o.clubGroupId === s.clubGroupId
        return !o.clubGroupId && o.clubId === s.clubId
      })
      .map(formatDayKeep)
      .sort((a, b) => a.localeCompare(b, "tr"))
    siblingsBySchedule.set(s.id, others)
  }

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
    const otherDaysKeep = siblingsBySchedule.get(s.id) ?? []
    const base = {
      kind: "CLUB" as const,
      scheduleOrSessionId: s.id,
      clubId: s.clubId,
      clubGroupId: s.clubGroupId,
      studyGroupId: null as string | null,
      label,
      dayOfWeek: s.dayOfWeek,
      dayLabel: DAY_LABELS[s.dayOfWeek] || String(s.dayOfWeek),
      startTime: s.startTime,
      endTime: s.endTime,
      teacherName,
      canExcludeDay: true,
      otherDaysKeep,
    }
    for (const st of students) {
      if (excludedPairs.has(`${s.id}:${st.id}`)) continue
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
      dayLabel: DAY_LABELS[s.dayOfWeek] || String(s.dayOfWeek),
      startTime: s.startTime,
      endTime: s.endTime,
      teacherName,
      canExcludeDay: false,
      otherDaysKeep: [] as string[],
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

  const byStudentDay = new Map<string, FlatEntry[]>()
  for (const e of entries) {
    const k = `${e.studentId}|${e.dayOfWeek}`
    const list = byStudentDay.get(k) ?? []
    list.push(e)
    byStudentDay.set(k, list)
  }

  type ClusterDraft = {
    studentId: string
    firstName: string
    lastName: string
    grade: string
    dayOfWeek: number
    dayLabel: string
    timeLabel: string
    assignments: ConflictAssignment[]
  }

  const clusterDrafts: ClusterDraft[] = []

  for (const list of byStudentDay.values()) {
    if (list.length < 2) continue

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
            dayLabel: e.dayLabel,
            startTime: e.startTime,
            endTime: e.endTime,
            teacherName: e.teacherName,
            canExcludeDay: e.canExcludeDay,
            otherDaysKeep: e.otherDaysKeep,
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
      clusterDrafts.push({
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

  if (clusterDrafts.length === 0) return []

  const byStudent = new Map<
    string,
    {
      studentId: string
      firstName: string
      lastName: string
      grade: string
      clusters: StudentConflictCluster[]
      conflictingKeys: Set<string>
    }
  >()

  for (const c of clusterDrafts) {
    let row = byStudent.get(c.studentId)
    if (!row) {
      row = {
        studentId: c.studentId,
        firstName: c.firstName,
        lastName: c.lastName,
        grade: c.grade,
        clusters: [],
        conflictingKeys: new Set(),
      }
      byStudent.set(c.studentId, row)
    }
    row.clusters.push({
      dayOfWeek: c.dayOfWeek,
      dayLabel: c.dayLabel,
      timeLabel: c.timeLabel,
      assignments: c.assignments,
    })
    for (const a of c.assignments) row.conflictingKeys.add(a.key)
  }

  const studentIds = [...byStudent.keys()]

  const [selections, candidateGroups] = await Promise.all([
    prisma.clubSelection.findMany({
      where: { studentId: { in: studentIds } },
      include: { club: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.clubGroup.findMany({
      where: {
        isActive: true,
        schedules: { some: { isActive: true } },
      },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            instructor: { select: { firstName: true, lastName: true } },
          },
        },
        students: { select: { studentId: true } },
        schedules: {
          where: { isActive: true },
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        },
        _count: { select: { students: true } },
      },
      orderBy: [{ club: { name: "asc" } }, { name: "asc" }],
    }),
  ])

  const selectionsByStudent = new Map<string, ClubApplication[]>()
  for (const s of selections) {
    const list = selectionsByStudent.get(s.studentId) ?? []
    list.push({ clubId: s.club.id, clubName: s.club.name })
    selectionsByStudent.set(s.studentId, list)
  }

  const entriesByStudent = new Map<string, FlatEntry[]>()
  for (const e of entries) {
    const list = entriesByStudent.get(e.studentId) ?? []
    list.push(e)
    entriesByStudent.set(e.studentId, list)
  }

  const details: StudentConflictDetail[] = []

  for (const row of byStudent.values()) {
    const applications = selectionsByStudent.get(row.studentId) ?? []
    const appliedClubIds = new Set(applications.map((a) => a.clubId))

    const conflictingAssignmentsMap = new Map<string, ConflictAssignment>()
    for (const cluster of row.clusters) {
      for (const a of cluster.assignments) {
        if (!conflictingAssignmentsMap.has(a.key)) {
          conflictingAssignmentsMap.set(a.key, a)
        }
      }
    }
    const conflictingAssignments = [...conflictingAssignmentsMap.values()].sort(
      (a, b) =>
        a.dayOfWeek - b.dayOfWeek ||
        a.startTime.localeCompare(b.startTime) ||
        a.label.localeCompare(b.label, "tr")
    )

    // Çakışmayan mevcut program (alternatif uygunluğu için taban)
    const studentEntries = entriesByStudent.get(row.studentId) ?? []
    const baselineBlocks: TimeBlock[] = []
    const seenBaseline = new Set<string>()
    for (const e of studentEntries) {
      if (row.conflictingKeys.has(e.key)) continue
      const bk = `${e.dayOfWeek}|${e.startTime}|${e.endTime}|${e.key}`
      if (seenBaseline.has(bk)) continue
      seenBaseline.add(bk)
      baselineBlocks.push({
        dayOfWeek: e.dayOfWeek,
        startTime: e.startTime,
        endTime: e.endTime,
      })
    }

    const memberGroupIds = new Set(
      studentEntries
        .filter((e) => e.kind === "CLUB" && e.clubGroupId)
        .map((e) => e.clubGroupId as string)
    )

    const safeAlternatives: SafeClubOption[] = []
    for (const g of candidateGroups) {
      if (!appliedClubIds.has(g.clubId)) continue
      if (memberGroupIds.has(g.id)) continue
      if (g.schedules.length === 0) continue

      const groupBlocks = g.schedules.map((s) => ({
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
      }))
      const conflictsWithBaseline = groupBlocks.some((gb) =>
        baselineBlocks.some((bb) => blocksConflict(gb, bb))
      )
      if (conflictsWithBaseline) continue

      safeAlternatives.push({
        clubId: g.clubId,
        clubName: g.club.name,
        clubGroupId: g.id,
        clubGroupName: g.name,
        teacherName: g.club.instructor
          ? `${g.club.instructor.firstName} ${g.club.instructor.lastName}`
          : null,
        memberCount: g._count.students,
        schedules: g.schedules.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          dayLabel: DAY_LABELS[s.dayOfWeek] || String(s.dayOfWeek),
          startTime: s.startTime,
          endTime: s.endTime,
        })),
      })
    }

    row.clusters.sort(
      (a, b) => a.dayOfWeek - b.dayOfWeek || a.timeLabel.localeCompare(b.timeLabel)
    )

    details.push({
      studentId: row.studentId,
      firstName: row.firstName,
      lastName: row.lastName,
      grade: row.grade,
      gradeLevel: parseStudentGradeLevel(row.grade),
      applications,
      clusters: row.clusters,
      conflictingAssignments,
      safeAlternatives,
    })
  }

  details.sort((a, b) => {
    const gl = (a.gradeLevel ?? 99) - (b.gradeLevel ?? 99)
    if (gl !== 0) return gl
    return `${a.lastName} ${a.firstName}`.localeCompare(
      `${b.lastName} ${b.firstName}`,
      "tr"
    )
  })

  return details
}

/** Çakışan atamadan çıkar: kulüpte gün muafiyeti veya gruptan tam çıkış */
export type RemoveAssignmentMode = "exclude_day" | "leave_group"

export async function removeStudentFromAssignment(options: {
  studentId: string
  assignmentKey: string
  /**
   * exclude_day: yalnızca o ClubSchedule saatinden muaf (varsayılan kulüp)
   * leave_group: gruptan / seçimden tamamen çıkar
   */
  mode?: RemoveAssignmentMode
}): Promise<{ removed: string; error?: string }> {
  const { studentId, assignmentKey } = options
  const [kind, id] = assignmentKey.split(":")
  if (!kind || !id) {
    return { removed: "", error: `Geçersiz anahtar: ${assignmentKey}` }
  }

  if (kind === "CLUB") {
    const mode: RemoveAssignmentMode = options.mode ?? "exclude_day"

    if (mode === "exclude_day") {
      const result = await excludeStudentFromClubSchedule({
        studentId,
        clubScheduleId: id,
        note: "Çakışma paneli: bu günden çıkarıldı",
      })
      if (result.error) return { removed: "", error: result.error }
      return { removed: result.excluded }
    }

    const schedule = await prisma.clubSchedule.findUnique({
      where: { id },
      select: {
        clubGroupId: true,
        clubId: true,
        club: { select: { name: true } },
      },
    })
    if (!schedule) {
      return { removed: "", error: "Kulüp programı bulunamadı" }
    }

    if (schedule.clubGroupId) {
      const del = await prisma.clubGroupStudent.deleteMany({
        where: { clubGroupId: schedule.clubGroupId, studentId },
      })
      if (del.count === 0) {
        return { removed: "", error: `${schedule.club.name}: öğrenci bu grupta değil` }
      }
      // Bu grubun saat muafiyetlerini temizle
      await prisma.clubScheduleExclusion.deleteMany({
        where: {
          studentId,
          clubSchedule: { clubGroupId: schedule.clubGroupId },
        },
      })
      return { removed: `${schedule.club.name} grubundan tamamen çıkarıldı` }
    }

    const del = await prisma.clubSelection.deleteMany({
      where: { clubId: schedule.clubId, studentId },
    })
    if (del.count === 0) {
      return { removed: "", error: `${schedule.club.name}: seçim kaydı yok` }
    }
    await prisma.clubScheduleExclusion.deleteMany({
      where: {
        studentId,
        clubSchedule: { clubId: schedule.clubId, clubGroupId: null },
      },
    })
    return { removed: `${schedule.club.name} seçiminden çıkarıldı` }
  }

  if (kind === "STUDY_GROUP") {
    const session = await prisma.studyGroupSession.findUnique({
      where: { id },
      select: {
        studyGroupId: true,
        studyGroup: { select: { name: true } },
      },
    })
    if (!session) {
      return { removed: "", error: "ÖÇG oturumu bulunamadı" }
    }
    const del = await prisma.studyGroupStudent.deleteMany({
      where: { studyGroupId: session.studyGroupId, studentId },
    })
    if (del.count === 0) {
      return { removed: "", error: `${session.studyGroup.name}: öğrenci bu grupta değil` }
    }
    return { removed: `${session.studyGroup.name} ÖÇG grubundan çıkarıldı` }
  }

  return { removed: "", error: `Bilinmeyen tür: ${kind}` }
}

/** Öğrenciyi kulüp grubuna ekler (aynı kulübün diğer gruplarından çıkarır) */
export async function assignStudentToClubGroup(options: {
  studentId: string
  clubGroupId: string
}): Promise<{ assigned: string; error?: string }> {
  const { studentId, clubGroupId } = options

  const group = await prisma.clubGroup.findUnique({
    where: { id: clubGroupId },
    select: {
      id: true,
      name: true,
      isActive: true,
      clubId: true,
      club: { select: { id: true, name: true } },
    },
  })
  if (!group || !group.isActive) {
    return { assigned: "", error: "Kulüp grubu bulunamadı" }
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true },
  })
  if (!student) {
    return { assigned: "", error: "Öğrenci bulunamadı" }
  }

  await prisma.$transaction(async (tx) => {
    await tx.clubSelection.upsert({
      where: {
        studentId_clubId: { studentId, clubId: group.clubId },
      },
      create: { studentId, clubId: group.clubId },
      update: {},
    })

    // Aynı kulübün diğer gruplarından çıkar
    const otherGroups = await tx.clubGroup.findMany({
      where: { clubId: group.clubId, id: { not: group.id } },
      select: { id: true },
    })
    if (otherGroups.length > 0) {
      await tx.clubGroupStudent.deleteMany({
        where: {
          studentId,
          clubGroupId: { in: otherGroups.map((g) => g.id) },
        },
      })
    }

    await tx.clubGroupStudent.upsert({
      where: {
        clubGroupId_studentId: { clubGroupId: group.id, studentId },
      },
      create: { clubGroupId: group.id, studentId },
      update: {},
    })

    // Yeni atamada eski gün muafiyetlerini sıfırla (temiz başlangıç)
    await tx.clubScheduleExclusion.deleteMany({
      where: {
        studentId,
        clubSchedule: { clubGroupId: group.id },
      },
    })
  })

  return { assigned: `${group.club.name} / ${group.name} grubuna eklendi` }
}

/** Öğrenciyi ÖÇG grubuna ekler */
export async function assignStudentToStudyGroup(options: {
  studentId: string
  studyGroupId: string
}): Promise<{ assigned: string; error?: string }> {
  const { studentId, studyGroupId } = options

  const group = await prisma.studyGroup.findUnique({
    where: { id: studyGroupId },
    select: { id: true, name: true, isActive: true },
  })
  if (!group || !group.isActive) {
    return { assigned: "", error: "ÖÇG grubu bulunamadı" }
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true },
  })
  if (!student) {
    return { assigned: "", error: "Öğrenci bulunamadı" }
  }

  await prisma.studyGroupStudent.upsert({
    where: {
      studyGroupId_studentId: { studyGroupId: group.id, studentId },
    },
    create: { studyGroupId: group.id, studentId },
    update: {},
  })

  return { assigned: `${group.name} ÖÇG grubuna eklendi` }
}

/** @deprecated Eski keep/remove akışı — geriye uyumluluk */
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
    const result = await removeStudentFromAssignment({
      studentId,
      assignmentKey: key,
      mode: "leave_group",
    })
    if (result.error) errors.push(result.error)
    else if (result.removed) removed.push(result.removed)
  }

  return { removed, errors }
}
