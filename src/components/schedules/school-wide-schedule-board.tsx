"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getAuthHeaders } from "@/components/hr/hr-utils"
import {
  DAY_NAMES,
  DENEME_SINAVI_SUBJECT,
  WEEKDAY_INDEXES,
  gradeBandFor,
  normalizeTime,
  type GradeBand,
  type LessonSlot,
} from "@/lib/schedules/lesson-slots"
import type { SlotKind } from "@/lib/schedules/day-templates"

type ClassRow = {
  id: string
  name: string
  grade: number
  section: string
}

type ScheduleCell = {
  id: string
  classId: string
  subjectName: string
  dayOfWeek: number
  startTime: string
  endTime: string
  room: string | null
  teacherId: string
  teacherName: string
}

type PeriodRow = {
  key: string
  dayOfWeek: number
  dayLabel: string
  periodLabel: string
  isEtut: boolean
  /** Etiket → olası başlangıç saatleri (ortaokul + lise) */
  starts: string[]
}

type SlotKindChoice = "lesson" | "club" | "study"

type TeacherOpt = {
  id: string
  firstName: string
  lastName: string
  subject?: string | null
}

type ClubOpt = {
  id: string
  name: string
  instructorId: string | null
  instructor: TeacherOpt | null
}

type StudyOpt = {
  id: string
  name: string
  sessions: Array<{
    id: string
    dayOfWeek: number
    startTime: string
    endTime: string
    teacherId: string
    teacher: TeacherOpt
  }>
}

type EditTarget = {
  classRow: ClassRow
  period: PeriodRow
  /** Bu sınıfın bandına göre çözülmüş saat */
  startTime: string
  endTime: string
  existing: ScheduleCell | null
}

function basePeriodLabel(label: string): string {
  return label.replace(/\s*[·\-–]\s*(Ortaokul|Lise)\s*$/i, "").trim()
}

function isEtutLabel(label: string): boolean {
  return /et[uü]t/i.test(label)
}

function periodSortKey(label: string): number {
  const ders = label.match(/(\d+)\s*\.\s*Ders/i)
  if (ders) return Number(ders[1])
  const etut = label.match(/(\d+)\s*\.\s*Et[uü]t/i)
  if (etut) return 100 + Number(etut[1])
  if (isEtutLabel(label)) return 100
  return 50
}

function buildPeriodRows(
  ortaokulSlots: Array<LessonSlot & { kind?: SlotKind }>,
  liseSlots: Array<LessonSlot & { kind?: SlotKind }>
): PeriodRow[] {
  const usable = [...ortaokulSlots, ...liseSlots].filter((s) => {
    const k = s.kind ?? "LESSON"
    return k === "LESSON" || k === "ETUT"
  })

  const labelOrder: string[] = []
  const startsByLabel = new Map<string, Set<string>>()
  const endsByLabelStart = new Map<string, string>()

  for (const s of usable) {
    const label = basePeriodLabel(s.label) || `${s.startTime}`
    if (!startsByLabel.has(label)) {
      labelOrder.push(label)
      startsByLabel.set(label, new Set())
    }
    const start = normalizeTime(s.startTime)
    startsByLabel.get(label)!.add(start)
    endsByLabelStart.set(`${label}|${start}`, normalizeTime(s.endTime))
  }

  labelOrder.sort((a, b) => periodSortKey(a) - periodSortKey(b))

  const rows: PeriodRow[] = []
  for (const day of WEEKDAY_INDEXES) {
    for (const periodLabel of labelOrder) {
      rows.push({
        key: `${day}|${periodLabel}`,
        dayOfWeek: day,
        dayLabel: DAY_NAMES[day],
        periodLabel,
        isEtut: isEtutLabel(periodLabel),
        starts: [...(startsByLabel.get(periodLabel) ?? [])],
      })
    }
  }
  return rows
}

/** Sınıf bandına göre dönem saatini çözümle */
function resolveSlotTimes(
  classGrade: number,
  periodLabel: string,
  ortaokulSlots: Array<LessonSlot & { kind?: SlotKind }>,
  liseSlots: Array<LessonSlot & { kind?: SlotKind }>
): { startTime: string; endTime: string } | null {
  const band = gradeBandFor(classGrade)
  const slots = (band === "lise" ? liseSlots : ortaokulSlots).filter((s) => {
    const k = s.kind ?? "LESSON"
    return k === "LESSON" || k === "ETUT"
  })
  const hit = slots.find((s) => basePeriodLabel(s.label) === periodLabel)
  if (hit) {
    return {
      startTime: normalizeTime(hit.startTime),
      endTime: normalizeTime(hit.endTime),
    }
  }
  // Fallback: diğer bant
  const other = (band === "lise" ? ortaokulSlots : liseSlots).find(
    (s) => basePeriodLabel(s.label) === periodLabel
  )
  if (other) {
    return {
      startTime: normalizeTime(other.startTime),
      endTime: normalizeTime(other.endTime),
    }
  }
  return null
}

function shortTeacher(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return name
  return parts[parts.length - 1]
}

function detectEntryKind(subjectName: string): SlotKindChoice {
  const s = subjectName.trim().toLocaleLowerCase("tr")
  if (s.startsWith("kulüp") || s.startsWith("kulup")) return "club"
  if (s.startsWith("öçg") || s.startsWith("ocg") || s.startsWith("özel")) return "study"
  return "lesson"
}

function cellStyles(kind: SlotKindChoice | "deneme") {
  if (kind === "deneme") {
    return "bg-rose-50 ring-1 ring-rose-200 hover:bg-rose-100 text-rose-950"
  }
  if (kind === "club") {
    return "bg-amber-50 ring-1 ring-amber-200 hover:bg-amber-100 text-amber-950"
  }
  if (kind === "study") {
    return "bg-sky-50 ring-1 ring-sky-200 hover:bg-sky-100 text-sky-950"
  }
  return "bg-indigo-50 ring-1 ring-indigo-200 hover:bg-indigo-100 text-indigo-950"
}

export function SchoolWideScheduleBoard({
  classes,
  band,
  ortaokulSlots,
  liseSlots,
  gradeEtutExams = [],
}: {
  classes: ClassRow[]
  band: GradeBand
  ortaokulSlots: Array<LessonSlot & { kind?: SlotKind }>
  liseSlots: Array<LessonSlot & { kind?: SlotKind }>
  gradeEtutExams?: Array<{
    id: string
    grade: number
    dayOfWeek: number
    startTime: string
    endTime: string
    title: string
  }>
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [schedules, setSchedules] = useState<ScheduleCell[]>([])

  const [teachers, setTeachers] = useState<TeacherOpt[]>([])
  const [courses, setCourses] = useState<Array<{ id: string; name: string }>>([])
  const [clubs, setClubs] = useState<ClubOpt[]>([])
  const [studyGroups, setStudyGroups] = useState<StudyOpt[]>([])

  const [edit, setEdit] = useState<EditTarget | null>(null)
  const [entryKind, setEntryKind] = useState<SlotKindChoice>("lesson")
  const [subjectName, setSubjectName] = useState("")
  const [teacherId, setTeacherId] = useState("")
  const [room, setRoom] = useState("")
  const [clubId, setClubId] = useState("")
  const [studyGroupId, setStudyGroupId] = useState("")
  const [busy, setBusy] = useState(false)

  const loadSchedules = useCallback(async () => {
    const res = await fetch("/api/schedules", { cache: "no-store" })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || "Program yüklenemedi")
    const rows = Array.isArray(data.schedules) ? data.schedules : []
    setSchedules(
      rows
        .filter((s: { isActive?: boolean }) => s.isActive !== false)
        .map(
          (s: {
            id: string
            classId: string
            subjectName: string
            dayOfWeek: number
            startTime: string
            endTime: string
            room?: string | null
            teacherId?: string
            teacher?: {
              id?: string
              firstName?: string
              lastName?: string
            } | null
          }) => ({
            id: s.id,
            classId: s.classId,
            subjectName: s.subjectName,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            room: s.room ?? null,
            teacherId: s.teacherId || s.teacher?.id || "",
            teacherName: s.teacher
              ? `${s.teacher.firstName ?? ""} ${s.teacher.lastName ?? ""}`.trim()
              : "",
          })
        )
    )
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError("")
    Promise.all([
      loadSchedules(),
      fetch("/api/staff/pickers?type=teachers-and-counselors", { headers: getAuthHeaders() }).then((r) =>
        r.ok ? r.json() : { staff: [] }
      ),
      fetch("/api/schedules/courses", { cache: "no-store" }).then((r) =>
        r.ok ? r.json() : { courses: [] }
      ),
      fetch("/api/schedules/clubs", { cache: "no-store" }).then((r) =>
        r.ok ? r.json() : { clubs: [] }
      ),
      fetch("/api/study-groups", { cache: "no-store" }).then((r) =>
        r.ok ? r.json() : { groups: [] }
      ),
    ])
      .then(([, teacherData, courseData, clubData, studyData]) => {
        if (cancelled) return
        setTeachers(Array.isArray(teacherData.staff) ? teacherData.staff : [])
        setCourses(Array.isArray(courseData.courses) ? courseData.courses : [])
        setClubs(Array.isArray(clubData.clubs) ? clubData.clubs : [])
        const groups = Array.isArray(studyData.groups)
          ? studyData.groups
          : Array.isArray(studyData.studyGroups)
            ? studyData.studyGroups
            : []
        setStudyGroups(
          groups.map(
            (g: {
              id: string
              name: string
              sessions?: StudyOpt["sessions"]
            }) => ({
              id: g.id,
              name: g.name,
              sessions: Array.isArray(g.sessions) ? g.sessions : [],
            })
          )
        )
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Yüklenemedi")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [loadSchedules])

  const periodRows = useMemo(
    () => buildPeriodRows(ortaokulSlots, liseSlots),
    [ortaokulSlots, liseSlots]
  )

  const visibleClasses = useMemo(() => {
    return [...classes]
      .filter((c) => {
        if (band === "all") return true
        return gradeBandFor(c.grade) === band
      })
      .sort((a, b) => {
        if (a.grade !== b.grade) return a.grade - b.grade
        return a.section.localeCompare(b.section, "tr")
      })
  }, [classes, band])

  const startToPeriod = useMemo(() => {
    const map = new Map<string, string>()
    for (const row of periodRows) {
      for (const start of row.starts) {
        if (!map.has(`${row.dayOfWeek}|${start}`)) {
          map.set(`${row.dayOfWeek}|${start}`, row.periodLabel)
        }
      }
    }
    return map
  }, [periodRows])

  const cellMap = useMemo(() => {
    const map = new Map<string, ScheduleCell[]>()
    for (const s of schedules) {
      const start = normalizeTime(s.startTime)
      const period =
        startToPeriod.get(`${s.dayOfWeek}|${start}`) ??
        periodRows.find((r) => r.starts.includes(start))?.periodLabel
      if (!period) continue
      const key = `${s.classId}|${s.dayOfWeek}|${period}`
      const list = map.get(key) ?? []
      list.push(s)
      map.set(key, list)
    }
    return map
  }, [schedules, startToPeriod, periodRows])

  const dayRowSpans = useMemo(() => {
    const map = new Map<number, number>()
    for (const day of WEEKDAY_INDEXES) {
      map.set(
        day,
        periodRows.filter((r) => r.dayOfWeek === day).length
      )
    }
    return map
  }, [periodRows])

  const openCell = (classRow: ClassRow, period: PeriodRow, existing: ScheduleCell | null) => {
    const times = resolveSlotTimes(
      classRow.grade,
      period.periodLabel,
      ortaokulSlots,
      liseSlots
    )
    if (!times) {
      alert("Bu dönem için saat şablonu bulunamadı.")
      return
    }
    const startTime = existing
      ? normalizeTime(existing.startTime)
      : times.startTime
    const endTime = existing ? normalizeTime(existing.endTime) : times.endTime

    setEdit({ classRow, period, startTime, endTime, existing })
    if (existing) {
      const kind = detectEntryKind(existing.subjectName)
      setEntryKind(kind)
      setSubjectName(existing.subjectName)
      setTeacherId(existing.teacherId)
      setRoom(existing.room || "")
      setClubId("")
      setStudyGroupId("")
      if (kind === "club") {
        const club = clubs.find(
          (c) =>
            existing.subjectName.includes(c.name) ||
            existing.subjectName === `Kulüp · ${c.name}`
        )
        if (club) setClubId(club.id)
      }
      if (kind === "study") {
        const g = studyGroups.find(
          (sg) =>
            existing.subjectName.includes(sg.name) ||
            existing.subjectName === `ÖÇG · ${sg.name}`
        )
        if (g) setStudyGroupId(g.id)
      }
    } else {
      setEntryKind(period.isEtut ? "club" : "lesson")
      setSubjectName("")
      setTeacherId("")
      setRoom("")
      setClubId("")
      setStudyGroupId("")
    }
  }

  const closeEdit = () => {
    setEdit(null)
    setBusy(false)
  }

  useEffect(() => {
    if (!edit || entryKind !== "club" || !clubId) return
    const club = clubs.find((c) => c.id === clubId)
    if (!club) return
    setSubjectName(`Kulüp · ${club.name}`)
    if (club.instructorId) setTeacherId(club.instructorId)
  }, [clubId, clubs, edit, entryKind])

  useEffect(() => {
    if (!edit || entryKind !== "study" || !studyGroupId) return
    const g = studyGroups.find((sg) => sg.id === studyGroupId)
    if (!g) return
    setSubjectName(`ÖÇG · ${g.name}`)
    const session =
      g.sessions.find(
        (s) =>
          s.dayOfWeek === edit.period.dayOfWeek &&
          normalizeTime(s.startTime) === edit.startTime
      ) ?? g.sessions[0]
    if (session?.teacherId) setTeacherId(session.teacherId)
  }, [studyGroupId, studyGroups, edit, entryKind])

  const saveEdit = async () => {
    if (!edit) return
    let finalSubject = subjectName.trim()
    let finalTeacher = teacherId

    if (entryKind === "club") {
      const club = clubs.find((c) => c.id === clubId)
      if (!club) {
        alert("Kulüp seçiniz.")
        return
      }
      finalSubject = `Kulüp · ${club.name}`
      finalTeacher = club.instructorId || teacherId
      if (!finalTeacher) {
        alert("Bu kulübün öğretmeni yok. Önce kulübe öğretmen atayın veya öğretmen seçin.")
        return
      }
    } else if (entryKind === "study") {
      const g = studyGroups.find((sg) => sg.id === studyGroupId)
      if (!g) {
        alert("ÖÇG grubu seçiniz.")
        return
      }
      finalSubject = `ÖÇG · ${g.name}`
      if (!finalTeacher) {
        alert("Öğretmen seçiniz.")
        return
      }
    } else {
      if (!finalSubject || !finalTeacher) {
        alert("Ders adı ve öğretmen zorunludur.")
        return
      }
    }

    setBusy(true)
    try {
      const url = edit.existing ? `/api/schedules/${edit.existing.id}` : "/api/schedules"
      const method = edit.existing ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: edit.classRow.id,
          subjectName: finalSubject,
          teacherId: finalTeacher,
          dayOfWeek: edit.period.dayOfWeek,
          startTime: edit.startTime,
          endTime: edit.endTime,
          room: room.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert((data as { error?: string }).error || "Kayıt başarısız")
        return
      }
      if ((data as { pendingApproval?: boolean }).pendingApproval) {
        alert("Talebiniz onaya gönderildi.")
      }
      closeEdit()
      await loadSchedules()
    } finally {
      setBusy(false)
    }
  }

  const deleteEdit = async () => {
    if (!edit?.existing) return
    if (!confirm("Bu dersi silmek istiyor musunuz?")) return
    setBusy(true)
    try {
      const res = await fetch(`/api/schedules/${edit.existing.id}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert((data as { error?: string }).error || "Silinemedi")
        return
      }
      closeEdit()
      await loadSchedules()
    } finally {
      setBusy(false)
    }
  }

  const firstPeriodKeyByDay = useMemo(() => {
    const map = new Map<number, string>()
    for (const row of periodRows) {
      if (!map.has(row.dayOfWeek)) map.set(row.dayOfWeek, row.key)
    }
    return map
  }, [periodRows])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Tüm okul programı yükleniyor…
      </div>
    )
  }

  if (error) {
    return <p className="py-16 text-center text-rose-600">{error}</p>
  }

  if (visibleClasses.length === 0) {
    return <p className="py-16 text-center text-gray-500">Gösterilecek sınıf yok.</p>
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3 shrink-0 text-[11px] text-gray-600 px-0.5">
        <span>{visibleClasses.length} sınıf</span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-indigo-400" /> Ders
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" /> Kulüp
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-sky-400" /> ÖÇG
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-rose-400" /> Deneme
        </span>
        <span className="text-gray-400">· hücreye tıklayarak düzenleyin</span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-300 bg-white shadow-sm">
        <table className="border-collapse text-left">
          <thead className="sticky top-0 z-20">
            <tr className="bg-slate-900 text-white">
              <th className="sticky left-0 z-30 border-b border-r-2 border-slate-700 bg-slate-950 px-2 py-2 text-[10px] font-semibold min-w-[4.5rem] w-[4.5rem]">
                Gün
              </th>
              <th className="sticky left-[4.5rem] z-30 border-b border-r-2 border-slate-600 bg-slate-900 px-2 py-2 text-[10px] font-semibold min-w-[4.25rem] w-[4.25rem]">
                Saat
              </th>
              {visibleClasses.map((c, i) => (
                <th
                  key={c.id}
                  className={`border-b border-slate-700 px-1.5 py-2 text-center min-w-[5.25rem] ${
                    i === 0 ? "" : "border-l-[3px] border-l-slate-500"
                  }`}
                >
                  <span className="block text-xs font-bold whitespace-nowrap">{c.name}</span>
                  <span className="block text-[9px] font-normal text-slate-300">
                    {gradeBandFor(c.grade) === "ortaokul" ? "Ortaokul" : "Lise"}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periodRows.map((period) => {
              const showDay = firstPeriodKeyByDay.get(period.dayOfWeek) === period.key
              const span = dayRowSpans.get(period.dayOfWeek) ?? 1
              return (
                <tr
                  key={period.key}
                  className={period.isEtut ? "bg-amber-50/40" : undefined}
                >
                  {showDay ? (
                    <th
                      rowSpan={span}
                      className="sticky left-0 z-10 border-b border-r-2 border-slate-300 bg-slate-100 px-2 py-1 align-middle text-[11px] font-bold text-slate-800 w-[4.5rem]"
                    >
                      {period.dayLabel}
                    </th>
                  ) : null}
                  <th
                    className={`sticky left-[4.5rem] z-10 border-b border-r-2 border-slate-200 px-2 py-1 text-left text-[10px] font-medium whitespace-nowrap w-[4.25rem] ${
                      period.isEtut
                        ? "bg-amber-50 text-amber-900"
                        : "bg-slate-50 text-slate-700"
                    }`}
                  >
                    {period.periodLabel}
                  </th>
                  {visibleClasses.map((c, i) => {
                    const cells =
                      cellMap.get(`${c.id}|${period.dayOfWeek}|${period.periodLabel}`) ??
                      []
                    const primary = cells[0] ?? null
                    const times = period.isEtut
                      ? resolveSlotTimes(c.grade, period.periodLabel, ortaokulSlots, liseSlots)
                      : null
                    const deneme =
                      period.isEtut && times
                        ? gradeEtutExams.find(
                            (e) =>
                              e.grade === c.grade &&
                              e.dayOfWeek === period.dayOfWeek &&
                              normalizeTime(e.startTime) === times.startTime &&
                              normalizeTime(e.endTime) === times.endTime
                          )
                        : null
                    const kind = primary
                      ? detectEntryKind(primary.subjectName)
                      : deneme
                        ? ("deneme" as const)
                        : null
                    return (
                      <td
                        key={`${c.id}|${period.key}`}
                        className={`border-b border-slate-200 p-0.5 align-top ${
                          i === 0 ? "" : "border-l-[3px] border-l-slate-300"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (deneme && !primary) {
                              alert(
                                `${c.grade}. sınıf bu etütte “${deneme.title || DENEME_SINAVI_SUBJECT}” olarak işaretli. Değiştirmek için Ders Programı → Etüt denemesi.`
                              )
                              return
                            }
                            openCell(c, period, primary)
                          }}
                          className={`w-full min-h-[2.75rem] rounded-md px-1 py-0.5 text-left transition ${
                            primary || deneme
                              ? cellStyles(kind!)
                              : "hover:bg-slate-100/80 border border-dashed border-transparent hover:border-slate-300"
                          }`}
                          title={
                            primary
                              ? `${primary.subjectName}${
                                  primary.teacherName ? ` · ${primary.teacherName}` : ""
                                }`
                              : deneme
                                ? `${deneme.title || DENEME_SINAVI_SUBJECT} · ${c.grade}. sınıf`
                                : `${c.name} · ${period.dayLabel} ${period.periodLabel} — ekle`
                          }
                        >
                          {primary ? (
                            <>
                              <p className="text-[10px] font-semibold leading-tight line-clamp-2">
                                {primary.subjectName.replace(/^(Kulüp|ÖÇG)\s*·\s*/i, "")}
                              </p>
                              {primary.teacherName ? (
                                <p className="text-[9px] opacity-80 truncate mt-0.5">
                                  {shortTeacher(primary.teacherName)}
                                </p>
                              ) : null}
                              {kind && kind !== "lesson" && kind !== "deneme" ? (
                                <p className="text-[8px] font-medium uppercase tracking-wide mt-0.5 opacity-70">
                                  {kind === "club" ? "Kulüp" : "ÖÇG"}
                                </p>
                              ) : null}
                            </>
                          ) : deneme ? (
                            <>
                              <p className="text-[10px] font-semibold leading-tight line-clamp-2">
                                {deneme.title || DENEME_SINAVI_SUBJECT}
                              </p>
                              <p className="text-[8px] font-medium uppercase tracking-wide mt-0.5 opacity-70">
                                Deneme
                              </p>
                            </>
                          ) : (
                            <span className="block h-8" />
                          )}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && closeEdit()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {edit
                ? `${edit.classRow.name} · ${edit.period.dayLabel} ${edit.period.periodLabel}`
                : "Düzenle"}
            </DialogTitle>
            <DialogDescription>
              {edit
                ? `${edit.startTime}–${edit.endTime} · hızlı değişiklik`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {edit ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { id: "lesson" as const, label: "Ders" },
                    { id: "club" as const, label: "Kulüp" },
                    { id: "study" as const, label: "ÖÇG" },
                  ] as const
                ).map((opt) => (
                  <Button
                    key={opt.id}
                    type="button"
                    size="sm"
                    variant={entryKind === opt.id ? "default" : "outline"}
                    onClick={() => {
                      setEntryKind(opt.id)
                      if (opt.id === "lesson" && edit.existing) {
                        const k = detectEntryKind(edit.existing.subjectName)
                        if (k !== "lesson") {
                          setSubjectName("")
                          setTeacherId(edit.existing.teacherId)
                        }
                      }
                    }}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>

              {entryKind === "lesson" ? (
                <>
                  <div className="space-y-1.5">
                    <Label>Ders</Label>
                    <select
                      className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                      value={
                        courses.some((c) => c.name === subjectName) ? subjectName : "__custom__"
                      }
                      onChange={(e) => {
                        if (e.target.value === "__custom__") {
                          setSubjectName("")
                          return
                        }
                        setSubjectName(e.target.value)
                      }}
                    >
                      <option value="">Seçiniz</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                      <option value="__custom__">Diğer (yazın)</option>
                    </select>
                    {!courses.some((c) => c.name === subjectName) ? (
                      <Input
                        value={subjectName}
                        onChange={(e) => setSubjectName(e.target.value)}
                        placeholder="Ders adı"
                      />
                    ) : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Öğretmen</Label>
                    <select
                      className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                      value={teacherId}
                      onChange={(e) => setTeacherId(e.target.value)}
                    >
                      <option value="">Seçiniz</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.firstName} {t.lastName}
                          {t.subject ? ` (${t.subject})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : null}

              {entryKind === "club" ? (
                <div className="space-y-1.5">
                  <Label>Kulüp</Label>
                  <select
                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                    value={clubId}
                    onChange={(e) => setClubId(e.target.value)}
                  >
                    <option value="">Seçiniz</option>
                    {clubs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.instructor
                          ? ` · ${c.instructor.firstName} ${c.instructor.lastName}`
                          : " · öğretmensiz"}
                      </option>
                    ))}
                  </select>
                  {!clubs.find((c) => c.id === clubId)?.instructorId ? (
                    <div className="space-y-1.5 pt-1">
                      <Label>Öğretmen (kulüpte yoksa)</Label>
                      <select
                        className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                        value={teacherId}
                        onChange={(e) => setTeacherId(e.target.value)}
                      >
                        <option value="">Seçiniz</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.firstName} {t.lastName}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {entryKind === "study" ? (
                <>
                  <div className="space-y-1.5">
                    <Label>ÖÇG grubu</Label>
                    <select
                      className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                      value={studyGroupId}
                      onChange={(e) => setStudyGroupId(e.target.value)}
                    >
                      <option value="">Seçiniz</option>
                      {studyGroups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Öğretmen</Label>
                    <select
                      className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                      value={teacherId}
                      onChange={(e) => setTeacherId(e.target.value)}
                    >
                      <option value="">Seçiniz</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.firstName} {t.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : null}

              <div className="space-y-1.5">
                <Label>Oda (opsiyonel)</Label>
                <Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Oda" />
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {edit.existing ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="text-rose-700 border-rose-300"
                    disabled={busy}
                    onClick={() => void deleteEdit()}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Sil
                  </Button>
                ) : null}
                <div className="flex-1" />
                <Button type="button" variant="outline" disabled={busy} onClick={closeEdit}>
                  İptal
                </Button>
                <Button type="button" disabled={busy} onClick={() => void saveEdit()}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kaydet"}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
