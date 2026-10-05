"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { ClubScheduleRosterDialog } from "@/components/schedules/club-schedule-roster-dialog"
import {
  DAY_NAMES,
  WEEKDAY_INDEXES,
  normalizeTime,
} from "@/lib/schedules/lesson-slots"
import { normalizeSlotKind } from "@/lib/schedules/day-templates"

type KindFilter = "all" | "club" | "study"

type Instructor = {
  id: string
  firstName: string
  lastName: string
  subject?: string | null
}

type EtutSlot = {
  label: string
  startTime: string
  endTime: string
}

type ClubScheduleRow = {
  id: string
  clubId: string
  clubGroupId?: string | null
  dayOfWeek: number
  startTime: string
  endTime: string
  room: string | null
  club: {
    id: string
    name: string
    instructor: Instructor | null
    _count: { selections: number }
  }
  clubGroup?: {
    id: string
    name: string
    _count: { students: number }
  } | null
  exclusions?: Array<{ studentId: string }>
}

type ClubGroupCol = {
  key: string
  kind: "club"
  id: string
  title: string
  subtitle: string
  instructorLabel: string
}

type StudyGroupCol = {
  key: string
  kind: "study"
  id: string
  title: string
  subtitle: string
  instructorLabel: string
}

type Column = ClubGroupCol | StudyGroupCol

type StudySessionCell = {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  room: string | null
  topic: string
  groupId: string
  groupName: string
  teacherLabel: string
}

type GradeEtutExamRow = {
  id: string
  grade: number
  dayOfWeek: number
  startTime: string
  endTime: string
  title: string
}

type PeriodRow = {
  key: string
  dayOfWeek: number
  dayLabel: string
  slot: EtutSlot
}

function shortTeacher(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return name
  return parts[parts.length - 1]
}

function teacherName(t: Instructor | null | undefined): string {
  if (!t) return ""
  return `${t.firstName} ${t.lastName}`.trim()
}

export function ClubStudyWideScheduleBoard({
  kindFilter = "all",
  onlyScheduled = true,
}: {
  kindFilter?: KindFilter
  onlyScheduled?: boolean
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [clubSchedules, setClubSchedules] = useState<ClubScheduleRow[]>([])
  const [clubGroups, setClubGroups] = useState<
    Array<{
      id: string
      name: string
      clubId: string
      club: {
        id: string
        name: string
        instructor: Instructor | null
      }
      _count: { students: number; schedules: number }
    }>
  >([])
  const [studySessions, setStudySessions] = useState<StudySessionCell[]>([])
  const [studyGroups, setStudyGroups] = useState<
    Array<{ id: string; name: string; sessionCount: number }>
  >([])
  const [etutSlots, setEtutSlots] = useState<EtutSlot[]>([])
  const [gradeEtutExams, setGradeEtutExams] = useState<GradeEtutExamRow[]>([])
  const [rosterId, setRosterId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const [clubsRes, studyRes, templatesRes, denemeRes] = await Promise.all([
        fetch("/api/schedules/clubs", { cache: "no-store" }),
        fetch("/api/study-groups", { cache: "no-store" }),
        fetch("/api/schedules/day-templates?band=all", { cache: "no-store" }),
        fetch("/api/schedules/grade-etut-exams", { cache: "no-store" }),
      ])

      if (!clubsRes.ok) throw new Error("Kulüp programları alınamadı")
      if (!studyRes.ok) throw new Error("ÖÇG grupları alınamadı")

      const clubData = await clubsRes.json()
      const studyData = await studyRes.json()

      setClubSchedules(Array.isArray(clubData.schedules) ? clubData.schedules : [])
      setClubGroups(Array.isArray(clubData.groups) ? clubData.groups : [])

      const groups = Array.isArray(studyData.groups) ? studyData.groups : []
      const sessions: StudySessionCell[] = []
      const studyCols: Array<{ id: string; name: string; sessionCount: number }> = []
      for (const g of groups) {
        const list = Array.isArray(g.sessions) ? g.sessions : []
        studyCols.push({ id: g.id, name: g.name, sessionCount: list.length })
        for (const s of list) {
          sessions.push({
            id: s.id,
            dayOfWeek: s.dayOfWeek,
            startTime: normalizeTime(s.startTime),
            endTime: normalizeTime(s.endTime),
            room: s.room ?? null,
            topic: s.topic || "",
            groupId: g.id,
            groupName: g.name,
            teacherLabel: teacherName(s.teacher),
          })
        }
      }
      setStudySessions(sessions)
      setStudyGroups(studyCols)

      const slotSeen = new Set<string>()
      const slots: EtutSlot[] = []

      // Kulüp API etüt slotları
      for (const s of Array.isArray(clubData.etutSlots) ? clubData.etutSlots : []) {
        const start = normalizeTime(s.startTime)
        const end = normalizeTime(s.endTime)
        const key = `${start}|${end}`
        if (slotSeen.has(key)) continue
        slotSeen.add(key)
        slots.push({
          label: String(s.label || `${start}`),
          startTime: start,
          endTime: end,
        })
      }

      // Şablondan eksik etütleri tamamla
      if (templatesRes.ok) {
        const tmpl = await templatesRes.json()
        for (const t of Array.isArray(tmpl.templates) ? tmpl.templates : []) {
          for (const s of Array.isArray(t.slots) ? t.slots : []) {
            if (normalizeSlotKind(s.kind, s.label) !== "ETUT") continue
            const start = normalizeTime(s.startTime)
            const end = normalizeTime(s.endTime)
            const key = `${start}|${end}`
            if (slotSeen.has(key)) continue
            slotSeen.add(key)
            slots.push({
              label: String(s.label || `${start}`),
              startTime: start,
              endTime: end,
            })
          }
        }
      }

      slots.sort((a, b) => a.startTime.localeCompare(b.startTime))
      setEtutSlots(slots)

      if (denemeRes.ok) {
        const d = await denemeRes.json()
        setGradeEtutExams(Array.isArray(d.exams) ? d.exams : [])
      } else {
        setGradeEtutExams([])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi")
      setClubSchedules([])
      setClubGroups([])
      setStudySessions([])
      setStudyGroups([])
      setEtutSlots([])
      setGradeEtutExams([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const columns = useMemo(() => {
    const cols: Column[] = []

    if (kindFilter === "all" || kindFilter === "club") {
      for (const g of clubGroups) {
        const scheduled =
          (g._count?.schedules ?? 0) > 0 ||
          clubSchedules.some((s) => (s.clubGroupId || s.clubGroup?.id) === g.id)
        if (onlyScheduled && !scheduled) continue
        cols.push({
          key: `club:${g.id}`,
          kind: "club",
          id: g.id,
          title: g.club.name,
          subtitle: g.name,
          instructorLabel: shortTeacher(teacherName(g.club.instructor)),
        })
      }

      // Grupsuz kulüp programları (eski kayıtlar)
      const orphanClubs = new Map<
        string,
        { name: string; instructor: Instructor | null; hasSchedule: boolean }
      >()
      for (const s of clubSchedules) {
        const gid = s.clubGroupId || s.clubGroup?.id
        if (gid) continue
        orphanClubs.set(s.clubId, {
          name: s.club.name,
          instructor: s.club.instructor,
          hasSchedule: true,
        })
      }
      for (const [clubId, info] of orphanClubs) {
        if (onlyScheduled && !info.hasSchedule) continue
        cols.push({
          key: `club-orphan:${clubId}`,
          kind: "club",
          id: `orphan:${clubId}`,
          title: info.name,
          subtitle: "Kulüp",
          instructorLabel: shortTeacher(teacherName(info.instructor)),
        })
      }
    }

    if (kindFilter === "all" || kindFilter === "study") {
      for (const g of studyGroups) {
        if (onlyScheduled && g.sessionCount === 0) continue
        cols.push({
          key: `study:${g.id}`,
          kind: "study",
          id: g.id,
          title: g.name,
          subtitle: "ÖÇG",
          instructorLabel: "",
        })
      }
    }

    cols.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "club" ? -1 : 1
      return `${a.title} ${a.subtitle}`.localeCompare(`${b.title} ${b.subtitle}`, "tr")
    })

    return cols
  }, [clubGroups, clubSchedules, studyGroups, kindFilter, onlyScheduled])

  const periodRows = useMemo(() => {
    const rows: PeriodRow[] = []
    for (const day of WEEKDAY_INDEXES) {
      for (const slot of etutSlots) {
        rows.push({
          key: `${day}|${slot.startTime}|${slot.endTime}`,
          dayOfWeek: day,
          dayLabel: DAY_NAMES[day],
          slot,
        })
      }
    }
    return rows
  }, [etutSlots])

  const dayRowSpans = useMemo(() => {
    const map = new Map<number, number>()
    for (const day of WEEKDAY_INDEXES) {
      map.set(day, etutSlots.length)
    }
    return map
  }, [etutSlots.length])

  const firstPeriodKeyByDay = useMemo(() => {
    const map = new Map<number, string>()
    for (const row of periodRows) {
      if (!map.has(row.dayOfWeek)) map.set(row.dayOfWeek, row.key)
    }
    return map
  }, [periodRows])

  const clubCellMap = useMemo(() => {
    const map = new Map<string, ClubScheduleRow[]>()
    for (const s of clubSchedules) {
      const groupId = s.clubGroupId || s.clubGroup?.id
      const colId = groupId || `orphan:${s.clubId}`
      const key = `${colId}|${s.dayOfWeek}|${normalizeTime(s.startTime)}|${normalizeTime(s.endTime)}`
      const list = map.get(key) ?? []
      list.push(s)
      map.set(key, list)
    }
    return map
  }, [clubSchedules])

  const studyCellMap = useMemo(() => {
    const map = new Map<string, StudySessionCell[]>()
    for (const s of studySessions) {
      const key = `${s.groupId}|${s.dayOfWeek}|${s.startTime}|${s.endTime}`
      const list = map.get(key) ?? []
      list.push(s)
      map.set(key, list)
    }
    return map
  }, [studySessions])

  const denemeBySlot = useMemo(() => {
    const map = new Map<string, number[]>()
    for (const e of gradeEtutExams) {
      const key = `${e.dayOfWeek}|${normalizeTime(e.startTime)}|${normalizeTime(e.endTime)}`
      const list = map.get(key) ?? []
      if (!list.includes(e.grade)) list.push(e.grade)
      map.set(key, list)
    }
    for (const [, grades] of map) grades.sort((a, b) => a - b)
    return map
  }, [gradeEtutExams])

  const stats = useMemo(
    () => ({
      clubs: columns.filter((c) => c.kind === "club").length,
      studies: columns.filter((c) => c.kind === "study").length,
      clubSessions: clubSchedules.length,
      studySessions: studySessions.length,
    }),
    [columns, clubSchedules.length, studySessions.length]
  )

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        ÖÇG ve kulüp programı yükleniyor…
      </div>
    )
  }

  if (error) {
    return <p className="py-16 text-center text-rose-600">{error}</p>
  }

  if (etutSlots.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 max-w-lg text-center">
          Henüz etüt saati yok. <strong>Ders saatleri</strong> içinde türü{" "}
          <strong>Etüt</strong> olan satırlar ekleyin.
        </div>
      </div>
    )
  }

  if (columns.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-6 text-sm text-gray-500 max-w-lg text-center">
          Gösterilecek kulüp / ÖÇG yok. Grup oluşturup <strong>Program ata</strong> ile etüt
          yerleştirin veya “Tümü” / program filtresini değiştirin.
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3 shrink-0 text-[11px] text-gray-600 px-0.5">
        <span>
          {stats.clubs} kulüp grubu · {stats.studies} ÖÇG
        </span>
        <span className="text-gray-400">
          ({stats.clubSessions} kulüp + {stats.studySessions} ÖÇG oturumu)
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" /> Kulüp
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-violet-400" /> ÖÇG
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-rose-400" /> Deneme
        </span>
        <span className="text-gray-400">· kulüp hücresine tıklayınca öğrenci listesi</span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-300 bg-white shadow-sm">
        <table className="border-collapse text-left">
          <thead className="sticky top-0 z-20">
            <tr className="bg-slate-900 text-white">
              <th className="sticky left-0 z-30 border-b border-r-2 border-slate-700 bg-slate-950 px-2 py-2 text-[10px] font-semibold min-w-[4.5rem] w-[4.5rem]">
                Gün
              </th>
              <th className="sticky left-[4.5rem] z-30 border-b border-r-2 border-slate-600 bg-slate-900 px-2 py-2 text-[10px] font-semibold min-w-[4.5rem] w-[4.5rem]">
                Etüt
              </th>
              {columns.map((col, i) => (
                <th
                  key={col.key}
                  className={`border-b border-slate-700 px-1.5 py-2 text-center min-w-[6rem] max-w-[7.5rem] ${
                    i === 0 ? "" : "border-l-[3px] border-l-slate-500"
                  } ${col.kind === "club" ? "bg-amber-950/40" : "bg-violet-950/40"}`}
                >
                  <span className="block text-[10px] font-bold leading-tight line-clamp-2">
                    {col.title}
                  </span>
                  <span
                    className={`block text-[9px] font-normal mt-0.5 ${
                      col.kind === "club" ? "text-amber-200" : "text-violet-200"
                    }`}
                  >
                    {col.kind === "club" ? col.subtitle : "ÖÇG"}
                    {col.instructorLabel ? ` · ${col.instructorLabel}` : ""}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periodRows.map((period) => {
              const showDay = firstPeriodKeyByDay.get(period.dayOfWeek) === period.key
              const span = dayRowSpans.get(period.dayOfWeek) ?? 1
              const denemeKey = `${period.dayOfWeek}|${period.slot.startTime}|${period.slot.endTime}`
              const denemeGrades = denemeBySlot.get(denemeKey) ?? []

              return (
                <tr key={period.key} className="bg-amber-50/30">
                  {showDay ? (
                    <th
                      rowSpan={span}
                      className="sticky left-0 z-10 border-b border-r-2 border-slate-300 bg-slate-100 px-2 py-1 align-middle text-[11px] font-bold text-slate-800 w-[4.5rem]"
                    >
                      {period.dayLabel}
                    </th>
                  ) : null}
                  <th className="sticky left-[4.5rem] z-10 border-b border-r-2 border-slate-200 bg-amber-50 px-2 py-1 text-left text-[10px] font-medium text-amber-900 whitespace-nowrap w-[4.5rem]">
                    <div>{period.slot.label}</div>
                    <div className="text-[9px] font-normal opacity-70">
                      {period.slot.startTime}–{period.slot.endTime}
                    </div>
                    {denemeGrades.length > 0 && (
                      <div className="mt-0.5 text-[8px] font-semibold text-rose-700 leading-tight">
                        Deneme {denemeGrades.map((g) => `${g}.`).join(" ")}
                      </div>
                    )}
                  </th>
                  {columns.map((col, i) => {
                    if (col.kind === "club") {
                      const entries =
                        clubCellMap.get(
                          `${col.id}|${period.dayOfWeek}|${period.slot.startTime}|${period.slot.endTime}`
                        ) ?? []
                      const primary = entries[0]
                      return (
                        <td
                          key={`${col.key}|${period.key}`}
                          className={`border-b border-slate-200 p-0.5 align-top ${
                            i === 0 ? "" : "border-l-[3px] border-l-slate-300"
                          }`}
                        >
                          {primary ? (
                            <button
                              type="button"
                              onClick={() => setRosterId(primary.id)}
                              className="w-full min-h-[2.75rem] rounded-md bg-amber-50 ring-1 ring-amber-200 hover:bg-amber-100 px-1 py-0.5 text-left transition text-amber-950"
                              title={`${primary.club.name}${
                                primary.clubGroup ? ` · ${primary.clubGroup.name}` : ""
                              }`}
                            >
                              <p className="text-[10px] font-semibold leading-tight line-clamp-2">
                                {primary.clubGroup?.name || primary.club.name}
                              </p>
                              {primary.club.instructor && (
                                <p className="text-[9px] opacity-80 truncate">
                                  {shortTeacher(teacherName(primary.club.instructor))}
                                </p>
                              )}
                              {(() => {
                                const total = primary.clubGroup
                                  ? primary.clubGroup._count.students
                                  : primary.club._count.selections
                                const muaf = primary.exclusions?.length ?? 0
                                return (
                                  <p className="text-[9px] text-amber-800/80">
                                    {Math.max(0, total - muaf)} öğr.
                                  </p>
                                )
                              })()}
                              {primary.room && (
                                <p className="text-[9px] text-gray-500 truncate">{primary.room}</p>
                              )}
                            </button>
                          ) : (
                            <div className="min-h-[2.75rem] rounded-md border border-dashed border-transparent" />
                          )}
                        </td>
                      )
                    }

                    const entries =
                      studyCellMap.get(
                        `${col.id}|${period.dayOfWeek}|${period.slot.startTime}|${period.slot.endTime}`
                      ) ?? []
                    const primary = entries[0]
                    return (
                      <td
                        key={`${col.key}|${period.key}`}
                        className={`border-b border-slate-200 p-0.5 align-top ${
                          i === 0 ? "" : "border-l-[3px] border-l-slate-300"
                        }`}
                      >
                        {primary ? (
                          <div
                            className="w-full min-h-[2.75rem] rounded-md bg-violet-50 ring-1 ring-violet-200 px-1 py-0.5 text-left text-violet-950"
                            title={`${primary.groupName}${
                              primary.topic ? ` · ${primary.topic}` : ""
                            }`}
                          >
                            <p className="text-[10px] font-semibold leading-tight line-clamp-2">
                              {primary.groupName}
                            </p>
                            {primary.teacherLabel && (
                              <p className="text-[9px] opacity-80 truncate">
                                {shortTeacher(primary.teacherLabel)}
                              </p>
                            )}
                            {primary.topic && (
                              <p className="text-[9px] text-violet-800/80 truncate">
                                {primary.topic}
                              </p>
                            )}
                            {primary.room && (
                              <p className="text-[9px] text-gray-500 truncate">{primary.room}</p>
                            )}
                          </div>
                        ) : (
                          <div className="min-h-[2.75rem] rounded-md border border-dashed border-transparent" />
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <ClubScheduleRosterDialog
        open={!!rosterId}
        clubScheduleId={rosterId}
        onOpenChange={(o) => {
          if (!o) setRosterId(null)
        }}
        onChanged={() => {
          void load()
        }}
      />
    </div>
  )
}
