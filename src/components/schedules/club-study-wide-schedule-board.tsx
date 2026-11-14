"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { ClubScheduleRosterDialog } from "@/components/schedules/club-schedule-roster-dialog"
import { StudentEtutMatrixBoard } from "@/components/schedules/student-etut-matrix-board"
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

type ClubScheduleRow = {
  id: string
  clubId: string
  clubGroupId?: string | null
  dayOfWeek: number
  startTime: string
  endTime: string
  room: string | null
  instructorId?: string | null
  instructor?: Instructor | null
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

type StudySessionCell = {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  room: string | null
  topic: string
  groupId: string
  groupName: string
  teacherId: string
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

type TeacherCol = {
  id: string
  name: string
}

type CellItem =
  | {
      kind: "club"
      key: string
      scheduleId: string
      label: string
      timeLabel: string
      countLabel: string
      room: string | null
    }
  | {
      kind: "study"
      key: string
      label: string
      timeLabel: string
      topic: string
      room: string | null
    }

function teacherName(t: Instructor | null | undefined): string {
  if (!t) return ""
  return `${t.firstName} ${t.lastName}`.trim()
}

function resolveClubInstructor(s: ClubScheduleRow): Instructor | null {
  return s.instructor ?? s.club.instructor ?? null
}

function clubCellLabel(s: ClubScheduleRow): string {
  const clubName = s.club.name.trim() || "Kulüp"
  const groupName = s.clubGroup?.name?.trim()
  if (groupName && groupName !== clubName) return `${clubName} (${groupName})`
  return clubName
}

export function ClubStudyWideScheduleBoard({
  kindFilter = "all",
  onlyScheduled = true,
  bandHint = "all",
}: {
  kindFilter?: KindFilter
  onlyScheduled?: boolean
  bandHint?: "all" | "ortaokul" | "lise"
}) {
  const [sheet, setSheet] = useState<"groups" | "students">("groups")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [clubSchedules, setClubSchedules] = useState<ClubScheduleRow[]>([])
  const [studySessions, setStudySessions] = useState<StudySessionCell[]>([])
  const [gradeEtutExams, setGradeEtutExams] = useState<GradeEtutExamRow[]>([])
  const [rosterId, setRosterId] = useState<string | null>(null)
  const [hasEtutSlots, setHasEtutSlots] = useState(true)

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

      const groups = Array.isArray(studyData.groups) ? studyData.groups : []
      const sessions: StudySessionCell[] = []
      for (const g of groups) {
        const list = Array.isArray(g.sessions) ? g.sessions : []
        for (const s of list) {
          const tid = String(s.teacher?.id ?? s.teacherId ?? "").trim()
          if (!tid) continue
          sessions.push({
            id: s.id,
            dayOfWeek: s.dayOfWeek,
            startTime: normalizeTime(s.startTime),
            endTime: normalizeTime(s.endTime),
            room: s.room ?? null,
            topic: s.topic || "",
            groupId: g.id,
            groupName: g.name,
            teacherId: tid,
            teacherLabel: teacherName(s.teacher),
          })
        }
      }
      setStudySessions(sessions)

      let etutFound = Array.isArray(clubData.etutSlots) && clubData.etutSlots.length > 0
      if (!etutFound && templatesRes.ok) {
        const tmpl = await templatesRes.json()
        for (const t of Array.isArray(tmpl.templates) ? tmpl.templates : []) {
          for (const s of Array.isArray(t.slots) ? t.slots : []) {
            if (normalizeSlotKind(s.kind, s.label) === "ETUT") {
              etutFound = true
              break
            }
          }
          if (etutFound) break
        }
      }
      setHasEtutSlots(etutFound)

      if (denemeRes.ok) {
        const d = await denemeRes.json()
        setGradeEtutExams(Array.isArray(d.exams) ? d.exams : [])
      } else {
        setGradeEtutExams([])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi")
      setClubSchedules([])
      setStudySessions([])
      setGradeEtutExams([])
      setHasEtutSlots(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const teacherColumns = useMemo(() => {
    const map = new Map<string, TeacherCol>()

    if (kindFilter === "all" || kindFilter === "club") {
      for (const s of clubSchedules) {
        if (!WEEKDAY_INDEXES.includes(s.dayOfWeek as (typeof WEEKDAY_INDEXES)[number])) continue
        const staff = resolveClubInstructor(s)
        if (!staff?.id) continue
        if (!map.has(staff.id)) {
          map.set(staff.id, { id: staff.id, name: teacherName(staff) })
        }
      }
    }

    if (kindFilter === "all" || kindFilter === "study") {
      for (const s of studySessions) {
        if (!WEEKDAY_INDEXES.includes(s.dayOfWeek as (typeof WEEKDAY_INDEXES)[number])) continue
        if (!s.teacherId) continue
        if (!map.has(s.teacherId)) {
          map.set(s.teacherId, {
            id: s.teacherId,
            name: s.teacherLabel || "Öğretmen",
          })
        }
      }
    }

    const cols = [...map.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "tr", { sensitivity: "base" }),
    )
    return onlyScheduled ? cols : cols
  }, [clubSchedules, studySessions, kindFilter, onlyScheduled])

  const cellMap = useMemo(() => {
    const map = new Map<string, CellItem[]>()

    const push = (teacherId: string, day: number, item: CellItem) => {
      const key = `${teacherId}|${day}`
      const list = map.get(key) ?? []
      if (!list.some((x) => x.key === item.key)) list.push(item)
      map.set(key, list)
    }

    if (kindFilter === "all" || kindFilter === "club") {
      for (const s of clubSchedules) {
        if (!WEEKDAY_INDEXES.includes(s.dayOfWeek as (typeof WEEKDAY_INDEXES)[number])) continue
        const staff = resolveClubInstructor(s)
        if (!staff?.id) continue
        const start = normalizeTime(s.startTime)
        const end = normalizeTime(s.endTime)
        const total = s.clubGroup
          ? s.clubGroup._count.students
          : s.club._count.selections
        const muaf = s.exclusions?.length ?? 0
        push(staff.id, s.dayOfWeek, {
          kind: "club",
          key: `club:${s.id}`,
          scheduleId: s.id,
          label: clubCellLabel(s),
          timeLabel: `${start}–${end}`,
          countLabel: `${Math.max(0, total - muaf)} öğr.`,
          room: s.room,
        })
      }
    }

    if (kindFilter === "all" || kindFilter === "study") {
      for (const s of studySessions) {
        if (!WEEKDAY_INDEXES.includes(s.dayOfWeek as (typeof WEEKDAY_INDEXES)[number])) continue
        if (!s.teacherId) continue
        push(s.teacherId, s.dayOfWeek, {
          kind: "study",
          key: `study:${s.id}`,
          label: s.groupName,
          timeLabel: `${s.startTime}–${s.endTime}`,
          topic: s.topic,
          room: s.room,
        })
      }
    }

    for (const [, list] of map) {
      list.sort((a, b) => a.timeLabel.localeCompare(b.timeLabel, "tr"))
    }
    return map
  }, [clubSchedules, studySessions, kindFilter])

  const denemeByDay = useMemo(() => {
    const map = new Map<number, number[]>()
    for (const e of gradeEtutExams) {
      const list = map.get(e.dayOfWeek) ?? []
      if (!list.includes(e.grade)) list.push(e.grade)
      map.set(e.dayOfWeek, list)
    }
    for (const [, grades] of map) grades.sort((a, b) => a - b)
    return map
  }, [gradeEtutExams])

  const stats = useMemo(() => {
    const clubItems = [...cellMap.values()].flat().filter((i) => i.kind === "club").length
    const studyItems = [...cellMap.values()].flat().filter((i) => i.kind === "study").length
    return {
      teachers: teacherColumns.length,
      clubSessions: clubItems,
      studySessions: studyItems,
    }
  }, [teacherColumns.length, cellMap])

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

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {sheet === "groups" ? (
          <div className="flex h-full min-h-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3 shrink-0 text-[11px] text-gray-600 px-0.5">
              <span>{stats.teachers} öğretmen</span>
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

            {!hasEtutSlots ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
                Henüz etüt saati yok. <strong>Ders saatleri</strong> içinde türü{" "}
                <strong>Etüt</strong> olan satırlar ekleyin.
              </div>
            ) : teacherColumns.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-6 text-sm text-gray-500 text-center">
                Gösterilecek öğretmen yok. Kulüp / ÖÇG programı atayıp öğretmen bağlayın veya
                filtreyi değiştirin.
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-auto rounded-xl border-2 border-slate-800 bg-white shadow-sm">
                <table className="border-collapse text-left border border-slate-800">
                  <thead className="sticky top-0 z-20">
                    <tr className="bg-slate-900 text-white">
                      <th className="sticky left-0 z-30 border-b border-r-2 border-slate-700 bg-slate-950 px-2 py-2 text-[10px] font-semibold min-w-[5.5rem] w-[5.5rem]">
                        Gün
                      </th>
                      {teacherColumns.map((col, i) => (
                        <th
                          key={col.id}
                          className={`border-b border-slate-700 px-2 py-2 text-center min-w-[9.5rem] bg-slate-900 ${
                            i === 0 ? "" : "border-l-[3px] border-l-slate-500"
                          }`}
                        >
                          <span className="block text-[11px] font-bold leading-snug">
                            {col.name}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {WEEKDAY_INDEXES.map((day) => {
                      const denemeGrades = denemeByDay.get(day) ?? []
                      return (
                        <tr key={day} className="bg-amber-50/30">
                          <th className="sticky left-0 z-10 border border-slate-800 border-r-2 bg-slate-100 px-2 py-2 align-middle text-[11px] font-bold text-slate-800 w-[5.5rem]">
                            <div>{DAY_NAMES[day]}</div>
                            {denemeGrades.length > 0 && (
                              <div className="mt-1 text-[8px] font-semibold text-rose-700 leading-tight">
                                Deneme {denemeGrades.map((g) => `${g}.`).join(" ")}
                              </div>
                            )}
                          </th>
                          {teacherColumns.map((col, i) => {
                            const items = cellMap.get(`${col.id}|${day}`) ?? []
                            return (
                              <td
                                key={`${col.id}|${day}`}
                                className={`border border-slate-800 p-0.5 align-top ${
                                  i === 0 ? "" : "border-l-[2px] border-l-slate-900"
                                }`}
                              >
                                {items.length > 0 ? (
                                  <div className="flex flex-col gap-0.5 min-h-[2.75rem]">
                                    {items.map((item) =>
                                      item.kind === "club" ? (
                                        <button
                                          key={item.key}
                                          type="button"
                                          onClick={() => setRosterId(item.scheduleId)}
                                          className="w-full rounded-md bg-amber-50 ring-1 ring-amber-200 hover:bg-amber-100 px-1 py-0.5 text-left transition text-amber-950"
                                          title={item.label}
                                        >
                                          <p className="text-[11px] font-semibold leading-snug">
                                            {item.label}
                                          </p>
                                          <p className="text-[10px] opacity-90 leading-snug mt-0.5">
                                            {item.timeLabel}
                                          </p>
                                          <p className="text-[10px] text-amber-800/80 mt-0.5">
                                            {item.countLabel}
                                          </p>
                                          {item.room ? (
                                            <p className="text-[10px] text-gray-600 mt-0.5">
                                              {item.room}
                                            </p>
                                          ) : null}
                                        </button>
                                      ) : (
                                        <div
                                          key={item.key}
                                          className="w-full rounded-md bg-violet-50 ring-1 ring-violet-200 px-1 py-0.5 text-left text-violet-950"
                                          title={`${item.label}${
                                            item.topic ? ` · ${item.topic}` : ""
                                          }`}
                                        >
                                          <p className="text-[11px] font-semibold leading-snug">
                                            {item.label}
                                          </p>
                                          <p className="text-[10px] opacity-90 leading-snug mt-0.5">
                                            {item.timeLabel}
                                          </p>
                                          {item.topic ? (
                                            <p className="text-[10px] text-violet-800/90 leading-snug mt-0.5">
                                              {item.topic}
                                            </p>
                                          ) : null}
                                          {item.room ? (
                                            <p className="text-[10px] text-gray-600 mt-0.5">
                                              {item.room}
                                            </p>
                                          ) : null}
                                        </div>
                                      ),
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
            )}
          </div>
        ) : (
          <div className="h-full min-h-0 overflow-hidden">
            <StudentEtutMatrixBoard kindFilter={kindFilter} bandHint={bandHint} />
          </div>
        )}
      </div>

      <div className="shrink-0 mt-2 flex items-end gap-0 border-t border-slate-300 bg-slate-200/80 px-1 pt-1">
        <button
          type="button"
          onClick={() => setSheet("groups")}
          className={`rounded-t-md px-4 py-1.5 text-xs font-semibold border border-b-0 transition ${
            sheet === "groups"
              ? "bg-white text-slate-900 border-slate-300 shadow-sm relative z-10 -mb-px"
              : "bg-slate-100 text-slate-600 border-transparent hover:bg-slate-50"
          }`}
        >
          1 · Kulüp & ÖÇG
        </button>
        <button
          type="button"
          onClick={() => setSheet("students")}
          className={`rounded-t-md px-4 py-1.5 text-xs font-semibold border border-b-0 transition ${
            sheet === "students"
              ? "bg-white text-slate-900 border-slate-300 shadow-sm relative z-10 -mb-px"
              : "bg-slate-100 text-slate-600 border-transparent hover:bg-slate-50"
          }`}
        >
          2 · Öğrenci × gün
        </button>
        <div className="flex-1 border-b border-slate-300 ml-1" />
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
