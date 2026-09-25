"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  ArrowLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  Search,
  Users,
} from "lucide-react"
import { getAuthHeaders } from "@/components/hr/hr-utils"
import { useStaffPermissions, checkNavPermission } from "@/hooks/use-staff-permissions"

type Kind = "CLASS" | "STUDY_GROUP" | "CLUB"
type Status = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"

type AttendanceRow = {
  id: string
  kind: Kind
  date: string
  lessonName: string
  startTime: string
  endTime: string
  status: Status
  note: string | null
  scheduleId?: string | null
  studyGroupSessionId?: string | null
  clubScheduleId?: string | null
  classId?: string | null
  student?: { id?: string; firstName: string; lastName: string; grade: string } | null
  teacher?: { id?: string; firstName: string; lastName: string } | null
  class?: { id?: string; name: string } | null
  studyGroupSession?: {
    id?: string
    topic: string
    studyGroup?: { id?: string; name: string; gradeLevel: number } | null
  } | null
  clubSchedule?: {
    id?: string
    club?: { id?: string; name: string } | null
  } | null
}

type Counts = {
  PRESENT: number
  ABSENT: number
  LATE: number
  EXCUSED: number
  total: number
}

type SessionGroup = {
  key: string
  date: string
  startTime: string
  endTime: string
  title: string
  subtitle: string
  teacherName: string
  rows: AttendanceRow[]
  counts: Counts
}

type CategoryGroup = {
  key: string
  label: string
  meta: string
  sessions: SessionGroup[]
  counts: Counts
}

const STATUS_TR: Record<Status, string> = {
  PRESENT: "Geldi",
  ABSENT: "Gelmedi",
  LATE: "Geç",
  EXCUSED: "İzinli",
}

const STATUS_CLASS: Record<Status, string> = {
  PRESENT: "bg-emerald-50 text-emerald-800",
  ABSENT: "bg-rose-50 text-rose-800",
  LATE: "bg-amber-50 text-amber-800",
  EXCUSED: "bg-sky-50 text-sky-800",
}

const TABS: Array<{ id: Kind; label: string; categoryLabel: string }> = [
  { id: "CLASS", label: "Ders programı", categoryLabel: "Sınıflar" },
  { id: "STUDY_GROUP", label: "ÖÇG", categoryLabel: "Gruplar" },
  { id: "CLUB", label: "Kulüp", categoryLabel: "Kulüpler" },
]

function localDateString(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function formatDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("tr-TR")
}

function emptyCounts(): Counts {
  return { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0, total: 0 }
}

function tally(rows: AttendanceRow[]): Counts {
  const c = emptyCounts()
  c.total = rows.length
  for (const r of rows) {
    if (r.status in c) c[r.status]++
  }
  return c
}

function teacherName(r: AttendanceRow) {
  return r.teacher ? `${r.teacher.firstName} ${r.teacher.lastName}` : "—"
}

function categoryKey(r: AttendanceRow, kind: Kind): { key: string; label: string; meta: string } {
  if (kind === "CLASS") {
    const name = r.class?.name || "Sınıfsız"
    return {
      key: r.classId || r.class?.id || name,
      label: name,
      meta: "Sınıf",
    }
  }
  if (kind === "STUDY_GROUP") {
    const g = r.studyGroupSession?.studyGroup
    const name = g?.name || r.lessonName || "ÖÇG"
    return {
      key: g?.id || name,
      label: name,
      meta: g?.gradeLevel ? `${g.gradeLevel}. sınıf` : "ÖÇG",
    }
  }
  const name = r.clubSchedule?.club?.name || r.lessonName || "Kulüp"
  return {
    key: r.clubSchedule?.club?.id || name,
    label: name,
    meta: "Kulüp",
  }
}

function sessionMeta(r: AttendanceRow, kind: Kind): { title: string; subtitle: string } {
  if (kind === "CLASS") {
    return {
      title: r.lessonName || "Ders",
      subtitle: r.class?.name || "",
    }
  }
  if (kind === "STUDY_GROUP") {
    const topic = r.studyGroupSession?.topic || r.lessonName
    return {
      title: topic,
      subtitle: r.studyGroupSession?.studyGroup?.name || "ÖÇG",
    }
  }
  return {
    title: r.clubSchedule?.club?.name || r.lessonName,
    subtitle: "Kulüp",
  }
}

function sessionKey(r: AttendanceRow, kind: Kind): string {
  const dateKey = typeof r.date === "string" ? r.date.slice(0, 10) : String(r.date)
  if (kind === "CLASS") {
    return [
      dateKey,
      r.scheduleId || "",
      r.startTime,
      r.endTime,
      r.lessonName,
      r.classId || r.class?.name || "",
      teacherName(r),
    ].join("|")
  }
  if (kind === "STUDY_GROUP") {
    return [
      dateKey,
      r.studyGroupSessionId || r.studyGroupSession?.id || "",
      r.startTime,
      r.endTime,
    ].join("|")
  }
  return [
    dateKey,
    r.clubScheduleId || r.clubSchedule?.id || "",
    r.startTime,
    r.endTime,
  ].join("|")
}

function buildCategories(rows: AttendanceRow[], kind: Kind): CategoryGroup[] {
  const catMap = new Map<string, { label: string; meta: string; sessions: Map<string, AttendanceRow[]> }>()

  for (const r of rows) {
    const cat = categoryKey(r, kind)
    let entry = catMap.get(cat.key)
    if (!entry) {
      entry = { label: cat.label, meta: cat.meta, sessions: new Map() }
      catMap.set(cat.key, entry)
    }
    const sk = sessionKey(r, kind)
    const list = entry.sessions.get(sk) ?? []
    list.push(r)
    entry.sessions.set(sk, list)
  }

  const categories: CategoryGroup[] = []
  for (const [key, entry] of catMap) {
    const sessions: SessionGroup[] = []
    for (const [sk, sessionRows] of entry.sessions) {
      const first = sessionRows[0]
      const meta = sessionMeta(first, kind)
      sessions.push({
        key: sk,
        date: first.date,
        startTime: first.startTime,
        endTime: first.endTime,
        title: meta.title,
        subtitle: meta.subtitle,
        teacherName: teacherName(first),
        rows: [...sessionRows].sort((a, b) => {
          const an = `${a.student?.lastName || ""} ${a.student?.firstName || ""}`
          const bn = `${b.student?.lastName || ""} ${b.student?.firstName || ""}`
          return an.localeCompare(bn, "tr")
        }),
        counts: tally(sessionRows),
      })
    }
    sessions.sort((a, b) => {
      const da = String(a.date).localeCompare(String(b.date))
      if (da !== 0) return -da
      return b.startTime.localeCompare(a.startTime)
    })
    const allRows = sessions.flatMap((s) => s.rows)
    categories.push({
      key,
      label: entry.label,
      meta: entry.meta,
      sessions,
      counts: tally(allRows),
    })
  }

  categories.sort((a, b) => a.label.localeCompare(b.label, "tr"))
  return categories
}

function CountPills({ counts, compact }: { counts: Counts; compact?: boolean }) {
  const items = [
    { key: "ABSENT" as const, label: "Gelmedi", className: "bg-rose-50 text-rose-800" },
    { key: "LATE" as const, label: "Geç", className: "bg-amber-50 text-amber-800" },
    { key: "EXCUSED" as const, label: "İzinli", className: "bg-sky-50 text-sky-800" },
    { key: "PRESENT" as const, label: "Geldi", className: "bg-emerald-50 text-emerald-800" },
  ]
  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? "" : ""}`}>
      {items.map((item) => {
        const n = counts[item.key]
        if (compact && item.key === "PRESENT" && counts.ABSENT + counts.LATE + counts.EXCUSED > 0) {
          // sorun varken "geldi"yi gizle — kartı sade tut
          return null
        }
        if (compact && n === 0 && item.key !== "ABSENT") return null
        return (
          <span
            key={item.key}
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${item.className}`}
          >
            {item.label}: {n}
          </span>
        )
      })}
      {!compact && (
        <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
          Toplam: {counts.total}
        </span>
      )}
    </div>
  )
}

export default function DevamsizlikPage() {
  const router = useRouter()
  const permState = useStaffPermissions()
  const [tab, setTab] = useState<Kind>("CLASS")
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return localDateString(d)
  })
  const [dateTo, setDateTo] = useState(() => localDateString())
  const [focusProblems, setFocusProblems] = useState(true)
  const [search, setSearch] = useState("")
  const [rows, setRows] = useState<AttendanceRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(null)
  const [selectedSessionKey, setSelectedSessionKey] = useState<string | null>(null)

  const canView = checkNavPermission(permState, "attendance", "view", false)
  const tabMeta = TABS.find((t) => t.id === tab) || TABS[0]

  useEffect(() => {
    if (!permState.permissionsLoaded) return
    if (permState.isSuperAdmin) return
    if (!canView) router.replace("/")
  }, [permState.permissionsLoaded, permState.isSuperAdmin, canView, router])

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams({
        kind: tab,
        dateFrom,
        dateTo,
      })
      const res = await fetch(`/api/attendance?${params}`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Yoklamalar alınamadı")
      setRows(Array.isArray(data.attendances) ? data.attendances : [])
    } catch (e) {
      setRows([])
      setError(e instanceof Error ? e.message : "Yüklenemedi")
    } finally {
      setLoading(false)
    }
  }, [tab, dateFrom, dateTo])

  useEffect(() => {
    if (!permState.permissionsLoaded) return
    if (!permState.isSuperAdmin && !canView) return
    void load()
  }, [load, permState.permissionsLoaded, permState.isSuperAdmin, canView])

  useEffect(() => {
    setSelectedCategoryKey(null)
    setSelectedSessionKey(null)
    setSearch("")
  }, [tab])

  const filteredRows = useMemo(() => {
    let list = rows
    if (focusProblems) {
      list = list.filter((r) => r.status !== "PRESENT")
    }
    const q = search.trim().toLocaleLowerCase("tr")
    if (!q) return list
    return list.filter((r) => {
      const hay = [
        r.lessonName,
        r.class?.name,
        r.student?.firstName,
        r.student?.lastName,
        r.teacher?.firstName,
        r.teacher?.lastName,
        r.studyGroupSession?.studyGroup?.name,
        r.studyGroupSession?.topic,
        r.clubSchedule?.club?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr")
      return hay.includes(q)
    })
  }, [rows, focusProblems, search])

  const categories = useMemo(
    () => buildCategories(filteredRows, tab),
    [filteredRows, tab]
  )

  const overall = useMemo(() => tally(filteredRows), [filteredRows])

  const selectedCategory = useMemo(
    () => categories.find((c) => c.key === selectedCategoryKey) || null,
    [categories, selectedCategoryKey]
  )

  const selectedSession = useMemo(
    () =>
      selectedCategory?.sessions.find((s) => s.key === selectedSessionKey) || null,
    [selectedCategory, selectedSessionKey]
  )

  // Filtre değişince seçim geçersiz kalırsa geri dön
  useEffect(() => {
    if (selectedCategoryKey && !selectedCategory) {
      setSelectedCategoryKey(null)
      setSelectedSessionKey(null)
    } else if (selectedSessionKey && selectedCategory && !selectedSession) {
      setSelectedSessionKey(null)
    }
  }, [
    selectedCategoryKey,
    selectedSessionKey,
    selectedCategory,
    selectedSession,
  ])

  if (!permState.permissionsLoaded) {
    return (
      <div className="flex justify-center py-20 text-gray-500 gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        Yükleniyor...
      </div>
    )
  }

  if (!permState.isSuperAdmin && !canView) return null

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
          <ClipboardList className="h-6 w-6 text-violet-700" />
          Devamsızlık
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Sınıf / grup / kulüp → oturum → öğrenci şeklinde izleyin. Varsayılan olarak
          yalnızca gelmedi / geç / izinli kayıtlar listelenir.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button
            key={t.id}
            size="sm"
            variant={tab === t.id ? "default" : "outline"}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtreler</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label className="text-xs">Başlangıç</Label>
              <input
                type="date"
                className="mt-1 block rounded-md border border-gray-200 px-3 py-2 text-sm"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Bitiş</Label>
              <input
                type="date"
                className="mt-1 block rounded-md border border-gray-200 px-3 py-2 text-sm"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <Button size="sm" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yenile"}
            </Button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                placeholder="Sınıf, öğrenci, öğretmen, ders ara…"
                className="w-full rounded-md border border-gray-200 py-2 pl-9 pr-3 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={focusProblems ? "default" : "outline"}
                onClick={() => setFocusProblems(true)}
              >
                Sorunlu kayıtlar
              </Button>
              <Button
                size="sm"
                variant={!focusProblems ? "default" : "outline"}
                onClick={() => setFocusProblems(false)}
              >
                Tüm yoklamalar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
        <CountPills counts={overall} />
        <span className="text-gray-400">
          {categories.length} {tabMeta.categoryLabel.toLocaleLowerCase("tr")}
        </span>
      </div>

      {error ? (
        <p className="py-8 text-center text-red-600">{error}</p>
      ) : loading ? (
        <div className="flex justify-center gap-2 py-16 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Yükleniyor...
        </div>
      ) : selectedSession && selectedCategory ? (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setSelectedSessionKey(null)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            {selectedCategory.label} oturumlarına dön
          </button>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{selectedSession.title}</CardTitle>
              <p className="text-sm text-gray-600">
                {formatDate(selectedSession.date)} · {selectedSession.startTime}–
                {selectedSession.endTime}
                {selectedSession.subtitle ? ` · ${selectedSession.subtitle}` : ""}
                {` · ${selectedSession.teacherName}`}
              </p>
              <div className="pt-2">
                <CountPills counts={selectedSession.counts} />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y border-t">
                {selectedSession.rows.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {r.student
                          ? `${r.student.firstName} ${r.student.lastName}`
                          : "—"}
                      </p>
                      {r.student?.grade && (
                        <p className="text-xs text-gray-500">{r.student.grade}</p>
                      )}
                      {r.note && (
                        <p className="mt-1 text-xs text-gray-500">Not: {r.note}</p>
                      )}
                    </div>
                    <span
                      className={`inline-flex w-fit rounded-md px-2.5 py-1 text-xs font-medium ${STATUS_CLASS[r.status]}`}
                    >
                      {STATUS_TR[r.status]}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : selectedCategory ? (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => {
              setSelectedCategoryKey(null)
              setSelectedSessionKey(null)
            }}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            {tabMeta.categoryLabel} listesine dön
          </button>

          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedCategory.label}
                </h2>
                <p className="text-xs text-gray-500">{selectedCategory.meta}</p>
              </div>
              <CountPills counts={selectedCategory.counts} />
            </div>
          </div>

          {selectedCategory.sessions.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">Oturum yok</p>
          ) : (
            <div className="grid gap-2">
              {selectedCategory.sessions.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSelectedSessionKey(s.key)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-left transition-colors hover:border-violet-200 hover:bg-violet-50/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{s.title}</p>
                      <p className="mt-0.5 text-xs text-gray-600">
                        {formatDate(s.date)} · {s.startTime}–{s.endTime} · {s.teacherName}
                      </p>
                      <div className="mt-2">
                        <CountPills counts={s.counts} compact />
                      </div>
                    </div>
                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-gray-400" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : categories.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center text-sm text-gray-500">
            {focusProblems
              ? "Bu aralıkta sorunlu (gelmedi / geç / izinli) kayıt yok."
              : "Bu aralıkta yoklama kaydı yok."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <Users className="h-4 w-4" />
            {tabMeta.categoryLabel}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {categories.map((c) => {
              const problemCount = c.counts.ABSENT + c.counts.LATE + c.counts.EXCUSED
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => {
                    setSelectedCategoryKey(c.key)
                    setSelectedSessionKey(null)
                  }}
                  className={`rounded-xl border px-4 py-4 text-left transition-colors hover:border-violet-300 hover:bg-violet-50/50 ${
                    problemCount > 0
                      ? "border-rose-200 bg-rose-50/40"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">{c.label}</p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {c.meta} · {c.sessions.length} oturum
                      </p>
                    </div>
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                  </div>
                  <div className="mt-3">
                    <CountPills counts={c.counts} compact={!focusProblems} />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
