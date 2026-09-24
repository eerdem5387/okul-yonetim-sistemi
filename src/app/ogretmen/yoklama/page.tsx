"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  BookOpen,
  CheckCircle,
  Clock,
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

export default function TeacherAttendancePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [staffId, setStaffId] = useState("")
  const [selectedDate, setSelectedDate] = useState(
    () => new Date().toISOString().split("T")[0]
  )
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [selected, setSelected] = useState<Session | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

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

  const loadSessions = useCallback(async () => {
    if (!staffId || !selectedDate) return
    setSessionsLoading(true)
    setSelected(null)
    setStudents([])
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

  const openSession = async (session: Session) => {
    setSelected(session)
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

      // Mevcut yoklamayı yükle
      const params = new URLSearchParams({
        date: selectedDate,
        teacherId: staffId,
        kind: session.kind,
      })
      if (session.scheduleId) params.set("scheduleId", session.scheduleId)
      if (session.studyGroupSessionId)
        params.set("studyGroupSessionId", session.studyGroupSessionId)
      if (session.clubScheduleId) params.set("clubScheduleId", session.clubScheduleId)

      const attRes = await fetch(`/api/attendance?${params}`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      })
      if (attRes.ok) {
        const attData = await attRes.json()
        for (const row of Array.isArray(attData.attendances) ? attData.attendances : []) {
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
    <div className="space-y-6 p-4 md:p-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Yoklama Al</h1>
        <p className="text-sm text-gray-600 mt-1">
          Ders programı, özel çalışma (ÖÇG) ve kulüp oturumları için yoklama alın.
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tarih</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="att-date" className="sr-only">
            Tarih
          </Label>
          <input
            id="att-date"
            type="date"
            className="rounded-md border border-gray-200 px-3 py-2 text-sm"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Bugünkü / seçili gün oturumları
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <div className="flex justify-center py-8 text-gray-500 gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Yükleniyor...
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">
              Bu günde size atanmış ders, ÖÇG veya kulüp yok.
            </p>
          ) : (
            <div className="grid gap-2">
              {sessions.map((s) => {
                const active = selected?.id === s.id && selected?.kind === s.kind
                return (
                  <button
                    key={`${s.kind}-${s.id}`}
                    type="button"
                    onClick={() => void openSession(s)}
                    className={`text-left rounded-xl border px-4 py-3 transition-colors ${
                      active
                        ? "border-violet-400 bg-violet-50"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{s.title}</p>
                        <p className="text-xs text-gray-600 mt-0.5 truncate">{s.subtitle}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="inline-block text-[10px] font-semibold uppercase tracking-wide rounded bg-gray-100 text-gray-700 px-2 py-0.5">
                          {KIND_LABEL[s.kind]}
                        </span>
                        <p className="text-xs text-gray-700 mt-1">
                          {s.startTime}–{s.endTime}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selected && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {selected.title}
                </CardTitle>
                <p className="text-xs text-gray-600 mt-1">
                  {KIND_LABEL[selected.kind]} · {selected.startTime}–{selected.endTime}
                  {selected.subtitle ? ` · ${selected.subtitle}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => markAll("PRESENT")}>
                  Tümü geldi
                </Button>
                <Button size="sm" variant="outline" onClick={() => markAll("ABSENT")}>
                  Tümü gelmedi
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-gray-600 mt-2">
              <span>Geldi: {counts.PRESENT}</span>
              <span>Gelmedi: {counts.ABSENT}</span>
              <span>Geç: {counts.LATE}</span>
              <span>İzinli: {counts.EXCUSED}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {studentsLoading ? (
              <div className="flex justify-center py-10 text-gray-500 gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Öğrenciler yükleniyor...
              </div>
            ) : students.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">Öğrenci listesi boş</p>
            ) : (
              <div className="divide-y rounded-xl border border-gray-200 bg-white">
                {students.map((s) => {
                  const st = statuses[s.id] || "PRESENT"
                  return (
                    <div
                      key={s.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {s.firstName} {s.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{s.grade}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(Object.keys(STATUS_META) as AttendanceStatus[]).map((key) => {
                          const meta = STATUS_META[key]
                          const Icon = meta.icon
                          const active = st === key
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() =>
                                setStatuses((prev) => ({ ...prev, [s.id]: key }))
                              }
                              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                                active ? meta.className : "border-gray-200 text-gray-600 hover:bg-gray-50"
                              }`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {meta.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {message && (
                <p className="text-sm text-gray-600 sm:flex-1 self-center">{message}</p>
              )}
              <Button
                className="sm:ml-auto"
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
          </CardContent>
        </Card>
      )}
    </div>
  )
}
