"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  Clock,
  History,
  Loader2,
  Users,
  XCircle,
  AlertCircle,
} from "lucide-react"
import { getAuthHeaders } from "@/components/hr/hr-utils"

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"

type Student = {
  id: string
  firstName: string
  lastName: string
  grade: string
}

type Session = {
  id: string
  kind: "CLASS" | "STUDY_GROUP" | "CLUB"
  scheduleId: string | null
  classId: string | null
  studyGroupSessionId: string | null
  clubScheduleId: string | null
  title: string
  subtitle: string
  startTime: string
  endTime: string
  room: string | null
  students: Student[] | null
  class: { id: string; name: string; grade: number; section: string } | null
  hasAttendance?: boolean
}

const STATUS_META: Record<
  AttendanceStatus,
  { label: string; className: string; icon: typeof CheckCircle }
> = {
  PRESENT: {
    label: "Geldi",
    className: "bg-emerald-50 text-emerald-800 border-emerald-200",
    icon: CheckCircle,
  },
  ABSENT: {
    label: "Gelmedi",
    className: "bg-rose-50 text-rose-800 border-rose-200",
    icon: XCircle,
  },
  LATE: {
    label: "Geç",
    className: "bg-amber-50 text-amber-800 border-amber-200",
    icon: Clock,
  },
  EXCUSED: {
    label: "İzinli",
    className: "bg-sky-50 text-sky-800 border-sky-200",
    icon: AlertCircle,
  },
}

const KIND_LABEL: Record<Session["kind"], string> = {
  CLASS: "Ders",
  STUDY_GROUP: "ÖÇG",
  CLUB: "Kulüp",
}

function localDateString(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map((x) => parseInt(x, 10) || 0)
  return h * 60 + m
}

function nowMinutes(d = new Date()) {
  return d.getHours() * 60 + d.getMinutes()
}

/** Seçili güne göre oturum geçmiş mi? */
function isSessionPast(
  session: Session,
  dateStr: string,
  now = new Date()
): boolean {
  const today = localDateString(now)
  if (dateStr < today) return true
  if (dateStr > today) return false
  return nowMinutes(now) >= timeToMinutes(session.endTime)
}

function needsAttendanceWarning(
  session: Session,
  dateStr: string,
  now = new Date()
): boolean {
  return isSessionPast(session, dateStr, now) && !session.hasAttendance
}

/** Şu an devam eden oturum; yoksa en yakın sonraki; o da yoksa en son biten. */
function pickLiveSession(sessions: Session[], now = new Date()): Session | null {
  if (sessions.length === 0) return null
  const mins = nowMinutes(now)
  const current = sessions.find((s) => {
    const start = timeToMinutes(s.startTime)
    const end = timeToMinutes(s.endTime)
    return mins >= start && mins < end
  })
  if (current) return current

  const upcoming = sessions
    .filter((s) => timeToMinutes(s.startTime) > mins)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
  if (upcoming[0]) return upcoming[0]

  return [...sessions].sort(
    (a, b) => timeToMinutes(b.endTime) - timeToMinutes(a.endTime)
  )[0]
}

function sessionPhase(
  session: Session,
  now = new Date()
): "current" | "upcoming" | "past" {
  const mins = nowMinutes(now)
  const start = timeToMinutes(session.startTime)
  const end = timeToMinutes(session.endTime)
  if (mins >= start && mins < end) return "current"
  if (mins < start) return "upcoming"
  return "past"
}

export default function TeacherAttendancePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [staffId, setStaffId] = useState("")
  const [mode, setMode] = useState<"live" | "history">("live")
  const [selectedDate, setSelectedDate] = useState(() => localDateString())
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [clock, setClock] = useState(() => new Date())
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState<Session | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const autoOpenedKey = useRef<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const role = localStorage.getItem("auth_role")
    const id = localStorage.getItem("staff_id")
    if (role !== "teacher" || !id) {
      router.push("/login")
      return
    }
    setStaffId(id)
    setLoading(false)
  }, [router])

  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  const loadSessions = useCallback(async () => {
    if (!staffId || !selectedDate) return
    setSessionsLoading(true)
    setMessage("")
    try {
      const res = await fetch(
        `/api/attendance/sessions?date=${selectedDate}&teacherId=${staffId}`,
        { headers: getAuthHeaders(), cache: "no-store" }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Oturumlar alınamadı")
      setSessions(Array.isArray(data.sessions) ? data.sessions : [])
    } catch (e) {
      setSessions([])
      setMessage(e instanceof Error ? e.message : "Oturumlar yüklenemedi")
    } finally {
      setSessionsLoading(false)
    }
  }, [staffId, selectedDate])

  useEffect(() => {
    void loadSessions()
  }, [loadSessions])

  const liveSession = useMemo(
    () => (mode === "live" ? pickLiveSession(sessions, clock) : null),
    [mode, sessions, clock]
  )

  const livePhase = liveSession ? sessionPhase(liveSession, clock) : null

  const missedSessions = useMemo(
    () =>
      sessions.filter((s) => needsAttendanceWarning(s, selectedDate, clock)),
    [sessions, selectedDate, clock]
  )

  const openSession = useCallback(
    async (session: Session) => {
      setSelected(session)
      setModalOpen(true)
      setMessage("")
      setStudentsLoading(true)
      try {
        let roster: Student[] = []
        if (session.kind === "CLASS" && session.classId) {
          const res = await fetch(`/api/classes/${session.classId}/students`, {
            cache: "no-store",
          })
          const data = await res.json().catch(() => ({}))
          const list = Array.isArray(data.students)
            ? data.students
            : Array.isArray(data)
              ? data
              : []
          roster = list.map(
            (s: Student & { student?: Student }) => s.student || s
          )
        } else if (Array.isArray(session.students)) {
          roster = session.students
        }

        setStudents(roster)

        const next: Record<string, AttendanceStatus> = {}
        for (const s of roster) next[s.id] = "PRESENT"

        const params = new URLSearchParams({
          date: selectedDate,
          teacherId: staffId,
          kind: session.kind,
        })
        if (session.scheduleId) params.set("scheduleId", session.scheduleId)
        if (session.studyGroupSessionId)
          params.set("studyGroupSessionId", session.studyGroupSessionId)
        if (session.clubScheduleId)
          params.set("clubScheduleId", session.clubScheduleId)

        const attRes = await fetch(`/api/attendance?${params}`, {
          headers: getAuthHeaders(),
          cache: "no-store",
        })
        if (attRes.ok) {
          const attData = await attRes.json()
          for (const row of Array.isArray(attData.attendances)
            ? attData.attendances
            : []) {
            if (row.studentId && row.status) next[row.studentId] = row.status
          }
        }
        setStatuses(next)
      } catch {
        setStudents([])
        setStatuses({})
      } finally {
        setStudentsLoading(false)
      }
    },
    [selectedDate, staffId]
  )

  // Canlı modda yalnızca şu an devam eden dersi otomatik aç
  useEffect(() => {
    if (mode !== "live" || sessionsLoading || !liveSession || !staffId) return
    if (selectedDate !== localDateString()) return
    if (sessionPhase(liveSession, clock) !== "current") return
    const key = `${selectedDate}|${liveSession.kind}|${liveSession.id}`
    if (autoOpenedKey.current === key) return
    autoOpenedKey.current = key
    void openSession(liveSession)
  }, [mode, sessionsLoading, liveSession, staffId, selectedDate, clock, openSession])

  const closeModal = (open: boolean) => {
    setModalOpen(open)
    if (!open) {
      setSelected(null)
      setStudents([])
      setStatuses({})
      setMessage("")
    }
  }

  const enterHistory = () => {
    autoOpenedKey.current = null
    closeModal(false)
    setMode("history")
    setSelectedDate(localDateString())
  }

  const exitHistory = () => {
    autoOpenedKey.current = null
    closeModal(false)
    setMode("live")
    setSelectedDate(localDateString())
  }

  const markAll = (status: AttendanceStatus) => {
    setStatuses((prev) => {
      const next = { ...prev }
      for (const s of students) next[s.id] = status
      return next
    })
  }

  const counts = useMemo(() => {
    const c = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 }
    for (const s of students) {
      const st = statuses[s.id] || "PRESENT"
      c[st]++
    }
    return c
  }, [students, statuses])

  const save = async () => {
    if (!selected || !staffId) return
    setSaving(true)
    setMessage("")
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: selected.kind,
          teacherId: staffId,
          date: selectedDate,
          lessonName: selected.title,
          startTime: selected.startTime,
          endTime: selected.endTime,
          scheduleId: selected.scheduleId,
          classId: selected.classId,
          studyGroupSessionId: selected.studyGroupSessionId,
          clubScheduleId: selected.clubScheduleId,
          attendances: students.map((s) => ({
            studentId: s.id,
            status: statuses[s.id] || "PRESENT",
          })),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Kayıt başarısız")
      setMessage(data.message || "Yoklama kaydedildi")
      setSessions((prev) =>
        prev.map((s) =>
          s.kind === selected.kind && s.id === selected.id
            ? { ...s, hasAttendance: true }
            : s
        )
      )
      void loadSessions()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Kayıt başarısız")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-gray-500 gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        Yükleniyor...
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 px-3 pb-8 pt-3 sm:max-w-2xl sm:px-4 md:max-w-3xl md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {mode === "history" && (
            <button
              type="button"
              onClick={exitHistory}
              className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 touch-manipulation"
            >
              <ArrowLeft className="h-4 w-4" />
              Bugüne dön
            </button>
          )}
          <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">
            {mode === "live" ? "Yoklama Al" : "Geçmişe dönük yoklama"}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {mode === "live"
              ? "Bulunduğunuz ders saati otomatik açılır."
              : "Tarih seçip oturuma dokunarak yoklama alın."}
          </p>
        </div>
        {mode === "live" && (
          <Button
            type="button"
            variant="outline"
            className="w-full shrink-0 touch-manipulation sm:w-auto"
            onClick={enterHistory}
          >
            <History className="mr-2 h-4 w-4" />
            Geçmişe dönük yoklama al
          </Button>
        )}
      </div>

      {mode === "history" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <Label htmlFor="att-date" className="mb-2 block text-sm font-medium text-gray-700">
            Tarih
          </Label>
          <input
            id="att-date"
            type="date"
            className="w-full rounded-xl border border-gray-200 px-3 py-3 text-base touch-manipulation sm:max-w-xs sm:text-sm"
            value={selectedDate}
            max={localDateString()}
            onChange={(e) => {
              autoOpenedKey.current = null
              setSelectedDate(e.target.value)
            }}
          />
        </div>
      )}

      {mode === "live" && missedSessions.length > 0 && (
        <button
          type="button"
          onClick={enterHistory}
          className="w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-left touch-manipulation"
        >
          <p className="flex items-center gap-1.5 text-sm font-semibold text-rose-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {missedSessions.length} geçmiş oturumda yoklama alınmadı
          </p>
          <p className="mt-1 text-xs text-rose-700">
            Geçmişe dönük yoklama almak için dokunun.
          </p>
        </button>
      )}

      {mode === "live" && (
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 shadow-sm">
          {sessionsLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Oturumlar yükleniyor...
            </div>
          ) : !liveSession ? (
            <div className="space-y-3 py-4 text-center">
              <p className="text-sm text-gray-600">
                Bugün size atanmış ders, ÖÇG veya kulüp yok.
              </p>
              <Button type="button" variant="outline" onClick={enterHistory}>
                Geçmişe dönük yoklama al
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                    livePhase === "current"
                      ? "bg-emerald-100 text-emerald-800"
                      : livePhase === "upcoming"
                        ? "bg-amber-100 text-amber-900"
                        : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {livePhase === "current"
                    ? "Şu anki ders"
                    : livePhase === "upcoming"
                      ? "Sıradaki ders"
                      : "Son ders"}
                </span>
                <span className="text-xs text-gray-500">
                  {clock.toLocaleTimeString("tr-TR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">{liveSession.title}</p>
                <p className="mt-0.5 text-sm text-gray-600">{liveSession.subtitle}</p>
                <p className="mt-2 text-sm font-medium text-gray-800">
                  {KIND_LABEL[liveSession.kind]} · {liveSession.startTime}–
                  {liveSession.endTime}
                  {liveSession.room ? ` · ${liveSession.room}` : ""}
                </p>
              </div>
              <Button
                type="button"
                className="h-12 w-full touch-manipulation text-base"
                onClick={() => void openSession(liveSession)}
              >
                <Users className="mr-2 h-4 w-4" />
                Yoklama al
              </Button>
            </div>
          )}
          {message && !modalOpen && (
            <p className="mt-3 text-center text-sm text-rose-600">{message}</p>
          )}
        </div>
      )}

      {mode === "history" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <BookOpen className="h-4 w-4" />
            Oturumlar
          </div>
          {sessionsLoading ? (
            <div className="flex justify-center gap-2 py-8 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Yükleniyor...
            </div>
          ) : sessions.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">
              Bu günde size atanmış ders, ÖÇG veya kulüp yok.
            </p>
          ) : (
            <div className="grid gap-2">
              {sessions.map((s) => {
                const missing = needsAttendanceWarning(s, selectedDate, clock)
                return (
                  <button
                    key={`${s.kind}-${s.id}`}
                    type="button"
                    onClick={() => void openSession(s)}
                    className={`touch-manipulation rounded-xl border px-4 py-3.5 text-left transition-colors active:bg-gray-50 hover:bg-gray-50 ${
                      missing
                        ? "border-rose-300 bg-rose-50/70"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900">{s.title}</p>
                        <p className="mt-0.5 truncate text-xs text-gray-600">
                          {s.subtitle}
                        </p>
                        {missing && (
                          <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-rose-700">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            Yoklama alınmadı
                          </p>
                        )}
                        {!missing && s.hasAttendance && isSessionPast(s, selectedDate, clock) && (
                          <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                            <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                            Yoklama alındı
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-700">
                          {KIND_LABEL[s.kind]}
                        </span>
                        <p className="mt-1 text-xs text-gray-700">
                          {s.startTime}–{s.endTime}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
          {message && !modalOpen && (
            <p className="mt-3 text-center text-sm text-rose-600">{message}</p>
          )}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={closeModal}>
        <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col overflow-hidden rounded-none p-0 m-0 sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl sm:m-4">
          <DialogHeader className="shrink-0 border-b border-gray-100 px-4 pb-3 pt-4 pr-12 text-left sm:px-6 sm:pt-5">
            <DialogTitle className="text-base sm:text-lg">
              {selected?.title || "Yoklama"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {selected
                ? `${KIND_LABEL[selected.kind]} · ${selected.startTime}–${selected.endTime}${
                    selected.subtitle ? ` · ${selected.subtitle}` : ""
                  }`
                : ""}
            </DialogDescription>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="touch-manipulation"
                onClick={() => markAll("PRESENT")}
              >
                Tümü geldi
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="touch-manipulation"
                onClick={() => markAll("ABSENT")}
              >
                Tümü gelmedi
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
              <span>Geldi: {counts.PRESENT}</span>
              <span>Gelmedi: {counts.ABSENT}</span>
              <span>Geç: {counts.LATE}</span>
              <span>İzinli: {counts.EXCUSED}</span>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-6">
            {studentsLoading ? (
              <div className="flex justify-center gap-2 py-16 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Öğrenciler yükleniyor...
              </div>
            ) : students.length === 0 ? (
              <p className="py-12 text-center text-sm text-gray-500">
                Öğrenci listesi boş
              </p>
            ) : (
              <div className="divide-y rounded-xl border border-gray-200 bg-white">
                {students.map((s) => {
                  const st = statuses[s.id] || "PRESENT"
                  return (
                    <div
                      key={s.id}
                      className="flex flex-col gap-2.5 px-3 py-3 sm:flex-row sm:items-center sm:gap-3 sm:px-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {s.firstName} {s.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{s.grade}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
                        {(Object.keys(STATUS_META) as AttendanceStatus[]).map(
                          (key) => {
                            const meta = STATUS_META[key]
                            const Icon = meta.icon
                            const active = st === key
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() =>
                                  setStatuses((prev) => ({
                                    ...prev,
                                    [s.id]: key,
                                  }))
                                }
                                className={`inline-flex min-h-10 items-center justify-center gap-1 rounded-lg border px-2.5 py-2 text-xs font-medium touch-manipulation transition-colors ${
                                  active
                                    ? meta.className
                                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                                }`}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                {meta.label}
                              </button>
                            )
                          }
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
            {message && (
              <p className="mb-2 text-center text-sm text-gray-600 sm:text-left">
                {message}
              </p>
            )}
            <Button
              className="h-12 w-full touch-manipulation text-base"
              onClick={() => void save()}
              disabled={saving || students.length === 0}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Yoklamayı kaydet"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
