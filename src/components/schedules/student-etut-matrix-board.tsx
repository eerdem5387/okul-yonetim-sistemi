"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { clubMatchesStudentGrade } from "@/lib/club-grade-levels"
import { hasTimeConflict } from "@/lib/schedules/time-conflict"

type KindFilter = "all" | "club" | "study"

type DayItem = {
  key: string
  kind: "CLUB" | "STUDY_GROUP"
  label: string
  startTime: string
  endTime: string
  clubGroupId: string | null
  studyGroupId: string | null
  scheduleOrSessionId: string
}

type FreeSlot = {
  label: string
  startTime: string
  endTime: string
}

type StudentRow = {
  id: string
  firstName: string
  lastName: string
  grade: string
  gradeLevel: number
  hasConflict: boolean
  hasEmptyDay: boolean
  days: Record<
    string,
    {
      items: DayItem[]
      hasConflict: boolean
      freeSlots: FreeSlot[]
    }
  >
}

type ClubOption = {
  id: string
  name: string
  clubId: string
  clubName: string
  gradeLevels: number[]
  teacherName: string | null
  memberCount: number
  schedules: Array<{
    dayOfWeek: number
    dayLabel: string
    startTime: string
    endTime: string
  }>
}

type StudyOption = {
  id: string
  name: string
  gradeLevels: number[]
  memberCount: number
  sessions: Array<{
    dayOfWeek: number
    dayLabel: string
    startTime: string
    endTime: string
    topic: string
  }>
}

type AssignTarget = {
  student: StudentRow
  dayOfWeek: number
  dayLabel: string
  freeSlots: FreeSlot[]
}

function shortLabel(label: string): string {
  // "Kulüp Adı · Grup" → kısa gösterim
  return label.replace(/\s*·\s*/g, " · ")
}

export function StudentEtutMatrixBoard({
  kindFilter = "all",
  bandHint = "all",
  refreshKey = 0,
}: {
  kindFilter?: KindFilter
  /** Üstteki fullscreen bandına hizala: all | ortaokul | lise */
  bandHint?: "all" | "ortaokul" | "lise"
  refreshKey?: number
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [grades, setGrades] = useState<number[]>([])
  const [weekdays, setWeekdays] = useState<Array<{ dayOfWeek: number; label: string }>>([])
  const [byGrade, setByGrade] = useState<Record<string, StudentRow[]>>({})
  const [clubOptions, setClubOptions] = useState<ClubOption[]>([])
  const [studyOptions, setStudyOptions] = useState<StudyOption[]>([])
  const [activeGrade, setActiveGrade] = useState<number | "all">("all")
  const [onlyProblems, setOnlyProblems] = useState(false)
  const [assignTarget, setAssignTarget] = useState<AssignTarget | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const band =
        activeGrade !== "all"
          ? "all"
          : bandHint === "ortaokul" || bandHint === "lise"
            ? bandHint
            : "all"
      const qs =
        activeGrade !== "all"
          ? `grade=${activeGrade}`
          : `band=${band}`
      const res = await fetch(`/api/schedules/student-etut-matrix?${qs}`, {
        cache: "no-store",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Matris yüklenemedi")

      setGrades(Array.isArray(data.grades) ? data.grades : [])
      setWeekdays(Array.isArray(data.weekdays) ? data.weekdays : [])
      setByGrade(data.byGrade && typeof data.byGrade === "object" ? data.byGrade : {})
      setClubOptions(Array.isArray(data.assignOptions?.clubGroups) ? data.assignOptions.clubGroups : [])
      setStudyOptions(
        Array.isArray(data.assignOptions?.studyGroups) ? data.assignOptions.studyGroups : []
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi")
      setByGrade({})
      setGrades([])
    } finally {
      setLoading(false)
    }
  }, [activeGrade, bandHint])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  const visibleGrades = useMemo(() => {
    if (activeGrade !== "all") return [activeGrade]
    return grades
  }, [activeGrade, grades])

  const filterStudent = useCallback(
    (s: StudentRow) => {
      if (!onlyProblems) return true
      return s.hasConflict || s.hasEmptyDay
    },
    [onlyProblems]
  )

  const filterItems = useCallback(
    (items: DayItem[]) => {
      if (kindFilter === "club") return items.filter((i) => i.kind === "CLUB")
      if (kindFilter === "study") return items.filter((i) => i.kind === "STUDY_GROUP")
      return items
    },
    [kindFilter]
  )

  const assignChoices = useMemo(() => {
    if (!assignTarget) return { clubs: [] as ClubOption[], studies: [] as StudyOption[] }
    const { student, dayOfWeek, freeSlots } = assignTarget
    const gradeStr = student.grade

    const clubs = clubOptions.filter((g) => {
      if (!clubMatchesStudentGrade(g.gradeLevels, gradeStr)) return false
      if (g.schedules.length === 0) return false
      const onDay = g.schedules.filter((sch) => sch.dayOfWeek === dayOfWeek)
      if (onDay.length === 0) return false
      // Boş slot ile örtüşen programı olanları öne al — hepsini göster
      if (freeSlots.length === 0) return true
      return onDay.some((sch) =>
        freeSlots.some((slot) =>
          hasTimeConflict(sch.startTime, sch.endTime, slot.startTime, slot.endTime)
        )
      )
    })

    const studies = studyOptions.filter((g) => {
      const levels = g.gradeLevels ?? []
      if (levels.length > 0 && !levels.includes(student.gradeLevel)) return false
      if (g.sessions.length === 0) return false
      const onDay = g.sessions.filter((sess) => sess.dayOfWeek === dayOfWeek)
      if (onDay.length === 0) return false
      if (freeSlots.length === 0) return true
      return onDay.some((sess) =>
        freeSlots.some((slot) =>
          hasTimeConflict(sess.startTime, sess.endTime, slot.startTime, slot.endTime)
        )
      )
    })

    // Eğer boş slota birebir uyan yoksa o günkü tüm uygunları göster
    const clubsFallback =
      clubs.length > 0
        ? clubs
        : clubOptions.filter(
            (g) =>
              clubMatchesStudentGrade(g.gradeLevels, gradeStr) &&
              g.schedules.some((sch) => sch.dayOfWeek === dayOfWeek)
          )
    const studiesFallback =
      studies.length > 0
        ? studies
        : studyOptions.filter((g) => {
            const levels = g.gradeLevels ?? []
            if (levels.length > 0 && !levels.includes(student.gradeLevel)) return false
            return g.sessions.some((sess) => sess.dayOfWeek === dayOfWeek)
          })

    return { clubs: clubsFallback, studies: studiesFallback }
  }, [assignTarget, clubOptions, studyOptions])

  const doAssign = async (kind: "club" | "study", groupId: string) => {
    if (!assignTarget) return
    setBusy(true)
    try {
      const res = await fetch(`/api/students/${assignTarget.student.id}/weekly-schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          kind === "club"
            ? { action: "assign_club_group", clubGroupId: groupId }
            : { action: "assign_study_group", studyGroupId: groupId }
        ),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data.error || "Atama başarısız")
        return
      }
      setAssignTarget(null)
      await load()
    } finally {
      setBusy(false)
    }
  }

  const openAssign = (student: StudentRow, dayOfWeek: number, dayLabel: string) => {
    const cell = student.days[String(dayOfWeek)]
    const freeSlots = cell?.freeSlots ?? []
    if (freeSlots.length === 0 && (cell?.items.length ?? 0) > 0) {
      // Dolu ama çakışmasız — yine de atama izni (başka gruba eklemek için)
    }
    setAssignTarget({
      student,
      dayOfWeek,
      dayLabel,
      freeSlots,
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Öğrenci etüt matrisi yükleniyor…
      </div>
    )
  }

  if (error) {
    return <p className="py-6 text-center text-rose-600 text-sm">{error}</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Öğrenci × gün etüt matrisi
          </h3>
          <p className="text-[11px] text-gray-500">
            Kırmızı satır = çakışma · Mavi satır = boş etüt · Boş/eksik hücreye tıklayarak ata
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            variant={activeGrade === "all" ? "default" : "outline"}
            className="h-7 text-xs"
            onClick={() => setActiveGrade("all")}
          >
            Tüm sınıflar
          </Button>
          {(bandHint === "lise" ? [9, 10, 11, 12] : bandHint === "ortaokul" ? [5, 6, 7, 8] : [5, 6, 7, 8, 9, 10, 11, 12]).map(
            (g) => (
              <Button
                key={g}
                size="sm"
                variant={activeGrade === g ? "default" : "outline"}
                className="h-7 text-xs px-2"
                onClick={() => setActiveGrade(g)}
              >
                {g}.
              </Button>
            )
          )}
          <Button
            size="sm"
            variant={onlyProblems ? "default" : "outline"}
            className="h-7 text-xs"
            onClick={() => setOnlyProblems((v) => !v)}
          >
            Sorunlular
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => void load()}>
            Yenile
          </Button>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 items-start">
        {visibleGrades.map((grade) => {
          const rows = (byGrade[String(grade)] ?? []).filter(filterStudent)
          return (
            <div
              key={grade}
              className="shrink-0 rounded-xl border border-slate-300 bg-white shadow-sm overflow-hidden min-w-[28rem]"
            >
              <div className="bg-slate-900 text-white px-3 py-2 text-xs font-bold tracking-wide">
                {grade}. SINIF
                <span className="ml-2 font-normal text-slate-300">{rows.length} öğrenci</span>
              </div>
              <div className="max-h-[min(70vh,42rem)] overflow-auto">
                <table className="border-collapse text-left w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-800 text-white">
                      <th className="sticky left-0 z-20 bg-slate-900 border-b border-r border-slate-700 px-3 py-2 text-[11px] font-semibold min-w-[11rem]">
                        Öğrenci
                      </th>
                      {weekdays.map((d) => (
                        <th
                          key={d.dayOfWeek}
                          className="border-b border-slate-700 px-2 py-2 text-center text-[11px] font-semibold min-w-[8rem]"
                        >
                          {d.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={1 + weekdays.length}
                          className="px-3 py-6 text-center text-xs text-gray-400"
                        >
                          Öğrenci yok
                        </td>
                      </tr>
                    ) : (
                      rows.map((s) => {
                        const nameBg = s.hasConflict
                          ? "bg-rose-200 text-rose-950"
                          : s.hasEmptyDay
                            ? "bg-sky-100 text-sky-950"
                            : "bg-white text-gray-900"
                        return (
                          <tr key={s.id} className="hover:bg-slate-50/80">
                            <td
                              className={`sticky left-0 z-[1] border-b border-r border-slate-200 px-3 py-1.5 text-[12px] font-medium whitespace-nowrap ${nameBg}`}
                            >
                              {s.lastName} {s.firstName}
                            </td>
                            {weekdays.map((d) => {
                              const cell = s.days[String(d.dayOfWeek)]
                              const items = filterItems(cell?.items ?? [])
                              const freeSlots = cell?.freeSlots ?? []
                              const conflict = cell?.hasConflict && items.length > 1
                              const isEmpty = items.length === 0

                              return (
                                <td
                                  key={d.dayOfWeek}
                                  className="border-b border-slate-100 p-0.5 align-top"
                                >
                                  <button
                                    type="button"
                                    onClick={() => openAssign(s, d.dayOfWeek, d.label)}
                                    className={`w-full min-h-[3rem] rounded px-1.5 py-1 text-left transition ${
                                      conflict
                                        ? "bg-rose-50 ring-1 ring-rose-300 hover:bg-rose-100"
                                        : isEmpty
                                          ? "hover:bg-emerald-50 border border-dashed border-transparent hover:border-emerald-300"
                                          : freeSlots.length > 0
                                            ? "bg-amber-50/60 ring-1 ring-amber-100 hover:bg-amber-50"
                                            : "bg-slate-50/80 hover:bg-slate-100"
                                    }`}
                                    title={
                                      isEmpty
                                        ? `${d.label}: boş — tıklayarak ata`
                                        : conflict
                                          ? `${d.label}: çakışma — tıklayarak başka atama ekle / gör`
                                          : `${d.label}: düzenlemek için tıkla`
                                    }
                                  >
                                    {isEmpty ? (
                                      <span className="block text-center text-[11px] text-gray-300">
                                        +
                                      </span>
                                    ) : (
                                      <div className="space-y-0.5">
                                        {items.map((it) => (
                                          <p
                                            key={it.key}
                                            className={`text-[11px] leading-snug ${
                                              conflict
                                                ? "font-semibold text-rose-800"
                                                : it.kind === "STUDY_GROUP"
                                                  ? "text-violet-900"
                                                  : "text-amber-950"
                                            }`}
                                          >
                                            {shortLabel(it.label)}
                                          </p>
                                        ))}
                                        {freeSlots.length > 0 && (
                                          <p className="text-[10px] text-amber-700/80">
                                            {freeSlots.length} boş etüt
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </button>
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </div>

      <Dialog
        open={!!assignTarget}
        onOpenChange={(o) => {
          if (!o) setAssignTarget(null)
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Etüt ataması</DialogTitle>
            <DialogDescription>
              {assignTarget
                ? `${assignTarget.student.lastName} ${assignTarget.student.firstName} · ${assignTarget.dayLabel}`
                : ""}
              {assignTarget && assignTarget.freeSlots.length > 0
                ? ` · Boş: ${assignTarget.freeSlots.map((s) => s.label).join(", ")}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {assignTarget && (
            <div className="space-y-4">
              {(() => {
                const cell = assignTarget.student.days[String(assignTarget.dayOfWeek)]
                const items = cell?.items ?? []
                if (items.length === 0) return null
                return (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-semibold text-slate-700 mb-1">
                      Bu gündeki mevcut atamalar
                      {cell?.hasConflict ? (
                        <span className="ml-1 text-rose-700">(çakışma)</span>
                      ) : null}
                    </p>
                    <ul className="space-y-1">
                      {items.map((it) => (
                        <li key={it.key} className="text-xs text-slate-800">
                          <span
                            className={
                              it.kind === "STUDY_GROUP" ? "text-violet-700" : "text-amber-800"
                            }
                          >
                            {it.kind === "STUDY_GROUP" ? "ÖÇG" : "Kulüp"}
                          </span>
                          {" · "}
                          {it.label}
                          <span className="text-slate-400">
                            {" "}
                            ({it.startTime}–{it.endTime})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })()}

              {(kindFilter === "all" || kindFilter === "club") && (
                <div>
                  <p className="text-xs font-semibold text-amber-900 mb-1.5">
                    Kulüp grupları ({assignChoices.clubs.length})
                  </p>
                  {assignChoices.clubs.length === 0 ? (
                    <p className="text-xs text-gray-500">Bu gün için uygun kulüp grubu yok.</p>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {assignChoices.clubs.map((g) => {
                        const onDay = g.schedules.filter(
                          (sch) => sch.dayOfWeek === assignTarget.dayOfWeek
                        )
                        return (
                          <button
                            key={g.id}
                            type="button"
                            disabled={busy}
                            onClick={() => void doAssign("club", g.id)}
                            className="w-full text-left rounded-md border border-amber-200 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 disabled:opacity-50"
                          >
                            <p className="text-xs font-semibold text-amber-950">
                              {g.clubName} · {g.name}
                            </p>
                            <p className="text-[10px] text-amber-800/80">
                              {onDay.map((s) => `${s.startTime}–${s.endTime}`).join(", ")}
                              {g.teacherName ? ` · ${g.teacherName}` : ""}
                              {` · ${g.memberCount} üye`}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {(kindFilter === "all" || kindFilter === "study") && (
                <div>
                  <p className="text-xs font-semibold text-violet-900 mb-1.5">
                    ÖÇG ({assignChoices.studies.length})
                  </p>
                  {assignChoices.studies.length === 0 ? (
                    <p className="text-xs text-gray-500">Bu gün için uygun ÖÇG yok.</p>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {assignChoices.studies.map((g) => {
                        const onDay = g.sessions.filter(
                          (sess) => sess.dayOfWeek === assignTarget.dayOfWeek
                        )
                        return (
                          <button
                            key={g.id}
                            type="button"
                            disabled={busy}
                            onClick={() => void doAssign("study", g.id)}
                            className="w-full text-left rounded-md border border-violet-200 bg-violet-50 hover:bg-violet-100 px-2.5 py-1.5 disabled:opacity-50"
                          >
                            <p className="text-xs font-semibold text-violet-950">{g.name}</p>
                            <p className="text-[10px] text-violet-800/80">
                              {onDay
                                .map(
                                  (s) =>
                                    `${s.startTime}–${s.endTime}${s.topic ? ` ${s.topic}` : ""}`
                                )
                                .join(", ")}
                              {` · ${g.memberCount} üye`}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
