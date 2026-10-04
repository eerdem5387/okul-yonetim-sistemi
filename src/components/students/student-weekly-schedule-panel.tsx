"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Calendar, Loader2, Plus, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { TeacherScheduleGrid } from "@/components/schedules/teacher-schedule-grid"
import {
  DAY_NAMES,
  DEFAULT_LESSON_SLOTS,
  DEFAULT_SATURDAY_SLOTS,
  normalizeTime,
  WEEKDAY_INDEXES,
  type LessonSlot,
} from "@/lib/schedules/lesson-slots"
import type { SlotKind } from "@/lib/schedules/day-templates"

type ScheduleKind = "class" | "club" | "study" | "deneme"

type ScheduleItem = {
  id: string
  kind: ScheduleKind
  subjectName: string
  className: string
  dayOfWeek: number
  startTime: string
  endTime: string
  room: string | null
  teacherName?: string | null
  assignmentKey?: string
  clubId?: string
  clubGroupId?: string | null
  studyGroupId?: string
  studyGroupSessionId?: string
  excluded?: boolean
  exclusionNote?: string | null
}

type ClubGroupOption = {
  id: string
  name: string
  clubId: string
  clubName: string
  studentCount: number
  scheduleCount: number
  schedules: Array<{ id: string; dayOfWeek: number; startTime: string; endTime: string }>
}

type StudyGroupOption = {
  id: string
  name: string
  gradeLevels: number[]
  studentCount: number
  sessionCount: number
  sessions: Array<{
    id: string
    dayOfWeek: number
    startTime: string
    endTime: string
    topic: string
  }>
}

type SlotRow = LessonSlot & { kind?: SlotKind; band?: "ortaokul" | "lise" }

type Props = {
  studentId: string
}

export function StudentWeeklySchedulePanel({ studentId }: Props) {
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [items, setItems] = useState<ScheduleItem[]>([])
  const [classInfo, setClassInfo] = useState<{
    id: string
    name: string
    grade: number
    saturdayEnabled?: boolean
  } | null>(null)
  const [clubGroups, setClubGroups] = useState<ClubGroupOption[]>([])
  const [studyGroups, setStudyGroups] = useState<StudyGroupOption[]>([])
  const [memberships, setMemberships] = useState<{
    clubGroups: Array<{ clubGroupId: string; clubGroupName: string; clubId: string; clubName: string }>
    studyGroups: Array<{ studyGroupId: string; studyGroupName: string }>
  }>({ clubGroups: [], studyGroups: [] })
  const [weekdaySlots, setWeekdaySlots] = useState<SlotRow[]>(DEFAULT_LESSON_SLOTS)
  const [saturdaySlots, setSaturdaySlots] = useState<SlotRow[]>(DEFAULT_SATURDAY_SLOTS)

  const [editItem, setEditItem] = useState<ScheduleItem | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [addTarget, setAddTarget] = useState<"club" | "study">("club")
  const [selectedClubGroupId, setSelectedClubGroupId] = useState("")
  const [selectedStudyGroupId, setSelectedStudyGroupId] = useState("")
  const [slotFilter, setSlotFilter] = useState<{
    dayOfWeek: number
    startTime: string
    endTime: string
  } | null>(null)

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/schedules/day-templates?band=all&scope=both", {
        cache: "no-store",
      })
      if (!res.ok) return
      const data = await res.json()
      const templates = Array.isArray(data.templates) ? data.templates : []
      const weekdayMap = new Map<string, SlotRow>()
      const saturdayMap = new Map<string, SlotRow>()
      for (const t of templates) {
        const rows = Array.isArray(t.slots) ? t.slots : []
        const band = t.band === "lise" ? ("lise" as const) : ("ortaokul" as const)
        const target = t.scope === "saturday" ? saturdayMap : weekdayMap
        for (const s of rows) {
          const kind = (s.kind ?? "LESSON") as SlotKind
          if (kind === "BREAK") continue
          if (!target.has(s.startTime)) {
            target.set(s.startTime, { ...s, band })
          }
        }
      }
      if (weekdayMap.size > 0) {
        setWeekdaySlots(
          [...weekdayMap.values()].sort((a, b) => a.startTime.localeCompare(b.startTime))
        )
      }
      if (saturdayMap.size > 0) {
        setSaturdaySlots(
          [...saturdayMap.values()].sort((a, b) => a.startTime.localeCompare(b.startTime))
        )
      }
    } catch {
      /* defaults */
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/students/${studentId}/weekly-schedule`, {
        cache: "no-store",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Program yüklenemedi")
      setItems(Array.isArray(data.items) ? data.items : [])
      setClassInfo(data.class ?? null)
      setClubGroups(Array.isArray(data.options?.clubGroups) ? data.options.clubGroups : [])
      setStudyGroups(Array.isArray(data.options?.studyGroups) ? data.options.studyGroups : [])
      setMemberships({
        clubGroups: Array.isArray(data.memberships?.clubGroups)
          ? data.memberships.clubGroups
          : [],
        studyGroups: Array.isArray(data.memberships?.studyGroups)
          ? data.memberships.studyGroups
          : [],
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi")
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => {
    void loadTemplates()
    void load()
  }, [load, loadTemplates])

  const visibleItems = useMemo(
    () =>
      items
        .filter((i) => !i.excluded)
        .map((i) => ({
          id: i.id,
          subjectName: i.subjectName,
          className:
            i.kind === "deneme"
              ? i.className
              : i.kind === "class"
                ? i.className
                : `${i.className}${i.teacherName ? ` · ${i.teacherName}` : ""}`,
          dayOfWeek: i.dayOfWeek,
          startTime: i.startTime,
          endTime: i.endTime,
          room: i.room,
          kind:
            i.kind === "deneme"
              ? ("class" as const)
              : i.kind === "class"
                ? ("class" as const)
                : i.kind === "study"
                  ? ("study" as const)
                  : ("club" as const),
        })),
    [items]
  )

  const editableItems = useMemo(
    () => items.filter((i) => (i.kind === "club" || i.kind === "study") && !i.excluded),
    [items]
  )

  const excludedItems = useMemo(() => items.filter((i) => i.kind === "club" && i.excluded), [items])

  const postAction = async (body: Record<string, unknown>) => {
    setBusy(true)
    try {
      const res = await fetch(`/api/students/${studentId}/weekly-schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data.error || "İşlem başarısız")
        return false
      }
      if (data.message) {
        // soft feedback
      }
      await load()
      return true
    } finally {
      setBusy(false)
    }
  }

  const filteredClubGroups = useMemo(() => {
    if (!slotFilter) return clubGroups
    return clubGroups.filter((g) =>
      g.schedules.some(
        (s) =>
          s.dayOfWeek === slotFilter.dayOfWeek &&
          normalizeTime(s.startTime) === normalizeTime(slotFilter.startTime) &&
          normalizeTime(s.endTime) === normalizeTime(slotFilter.endTime)
      )
    )
  }, [clubGroups, slotFilter])

  const filteredStudyGroups = useMemo(() => {
    if (!slotFilter) return studyGroups
    return studyGroups.filter((g) =>
      g.sessions.some(
        (s) =>
          s.dayOfWeek === slotFilter.dayOfWeek &&
          normalizeTime(s.startTime) === normalizeTime(slotFilter.startTime) &&
          normalizeTime(s.endTime) === normalizeTime(slotFilter.endTime)
      )
    )
  }, [studyGroups, slotFilter])

  const openAdd = (target: "club" | "study", slot?: typeof slotFilter) => {
    setAddTarget(target)
    setSlotFilter(slot ?? null)
    setSelectedClubGroupId("")
    setSelectedStudyGroupId("")
    setAddOpen(true)
  }

  const submitAdd = async () => {
    if (addTarget === "club") {
      if (!selectedClubGroupId) {
        alert("Kulüp grubu seçiniz.")
        return
      }
      const ok = await postAction({
        action: "assign_club_group",
        clubGroupId: selectedClubGroupId,
      })
      if (ok) setAddOpen(false)
      return
    }
    if (!selectedStudyGroupId) {
      alert("ÖÇG grubu seçiniz.")
      return
    }
    const ok = await postAction({
      action: "assign_study_group",
      studyGroupId: selectedStudyGroupId,
    })
    if (ok) setAddOpen(false)
  }

  const moveFromEdit = async (to: "club" | "study") => {
    if (!editItem) return
    if (to === "club") {
      if (!selectedClubGroupId) {
        alert("Hedef kulüp grubu seçiniz.")
        return
      }
      if (editItem.kind === "club" && editItem.assignmentKey) {
        await postAction({ action: "leave_group", assignmentKey: editItem.assignmentKey })
      } else if (editItem.kind === "study" && editItem.studyGroupId) {
        await postAction({
          action: "leave_study_group",
          studyGroupId: editItem.studyGroupId,
        })
      }
      const ok = await postAction({
        action: "assign_club_group",
        clubGroupId: selectedClubGroupId,
      })
      if (ok) setEditItem(null)
      return
    }
    if (!selectedStudyGroupId) {
      alert("Hedef ÖÇG grubu seçiniz.")
      return
    }
    if (editItem.kind === "club" && editItem.assignmentKey) {
      await postAction({ action: "leave_group", assignmentKey: editItem.assignmentKey })
    } else if (editItem.kind === "study" && editItem.studyGroupId) {
      await postAction({
        action: "leave_study_group",
        studyGroupId: editItem.studyGroupId,
      })
    }
    const ok = await postAction({
      action: "assign_study_group",
      studyGroupId: selectedStudyGroupId,
    })
    if (ok) setEditItem(null)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-gray-500 gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        Haftalık program yükleniyor...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-indigo-600" />
                Haftalık program
              </CardTitle>
              <CardDescription>
                {classInfo
                  ? `${classInfo.name} dersleri + kulüp / ÖÇG etütleri`
                  : "Aktif sınıf ataması yok — yalnızca kulüp / ÖÇG gösterilir"}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => openAdd("club")}
                disabled={busy}
              >
                <Plus className="h-4 w-4 mr-1" />
                Kulübe al
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => openAdd("study")}
                disabled={busy}
              >
                <Plus className="h-4 w-4 mr-1" />
                ÖÇG’ye al
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void load()}
                disabled={busy}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Yenile
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}

          <TeacherScheduleGrid
            items={visibleItems}
            weekdaySlots={weekdaySlots}
            saturdaySlots={saturdaySlots}
            title={classInfo?.name}
          />

          {editableItems.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
              <p className="text-sm font-semibold text-gray-900">Düzenlenebilir atamalar</p>
              <p className="text-xs text-gray-500">
                Kulüp veya ÖÇG satırına tıklayarak bu günden çıkarabilir, gruptan tamamen
                çıkarabilir veya başka kulüp / ÖÇG’ye taşıyabilirsiniz.
              </p>
              <div className="space-y-1.5">
                {editableItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setEditItem(item)
                      setSelectedClubGroupId("")
                      setSelectedStudyGroupId("")
                      setSlotFilter({
                        dayOfWeek: item.dayOfWeek,
                        startTime: item.startTime,
                        endTime: item.endTime,
                      })
                    }}
                    className={`w-full text-left rounded-lg border px-3 py-2 transition hover:border-indigo-300 hover:bg-indigo-50/50 ${
                      item.kind === "club"
                        ? "border-amber-200 bg-amber-50/40"
                        : "border-sky-200 bg-sky-50/40"
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-900">
                      {DAY_NAMES[item.dayOfWeek]} · {normalizeTime(item.startTime)}–
                      {normalizeTime(item.endTime)} · {item.subjectName}
                    </p>
                    <p className="text-xs text-gray-600">
                      {item.kind === "club" ? "Kulüp" : "ÖÇG"} · {item.className}
                      {item.teacherName ? ` · ${item.teacherName}` : ""}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {excludedItems.length > 0 && (
            <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-3 space-y-2">
              <p className="text-sm font-semibold text-rose-950">Bu günden muaf kulüp saatleri</p>
              {excludedItems.map((item) => (
                <div
                  key={`ex-${item.id}`}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-rose-100 bg-white px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {DAY_NAMES[item.dayOfWeek]} · {item.startTime}–{item.endTime} ·{" "}
                      {item.subjectName}
                    </p>
                    <p className="text-xs text-gray-500">{item.className}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy || !item.assignmentKey}
                    onClick={() =>
                      void postAction({
                        action: "restore_day",
                        assignmentKey: item.assignmentKey,
                      })
                    }
                  >
                    Geri al
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-amber-100 bg-amber-50/30 p-3">
              <p className="text-sm font-semibold text-amber-950 mb-2">Kulüp grupları</p>
              {memberships.clubGroups.length === 0 ? (
                <p className="text-xs text-gray-500">Aktif kulüp grubu yok</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {memberships.clubGroups.map((m) => (
                    <li key={m.clubGroupId} className="text-gray-800">
                      {m.clubName} · {m.clubGroupName}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-xl border border-sky-100 bg-sky-50/30 p-3">
              <p className="text-sm font-semibold text-sky-950 mb-2">ÖÇG grupları</p>
              {memberships.studyGroups.length === 0 ? (
                <p className="text-xs text-gray-500">Aktif ÖÇG yok</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {memberships.studyGroups.map((m) => (
                    <li
                      key={m.studyGroupId}
                      className="flex items-center justify-between gap-2 text-gray-800"
                    >
                      <span>{m.studyGroupName}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-red-700"
                        disabled={busy}
                        onClick={() =>
                          void postAction({
                            action: "leave_study_group",
                            studyGroupId: m.studyGroupId,
                          })
                        }
                      >
                        Çıkar
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-gray-200 p-3">
            <p className="text-xs font-medium text-gray-700 mb-2">
              Boş etüt saatine hızlı ekleme
            </p>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAY_INDEXES.flatMap((day) =>
                weekdaySlots
                  .filter((s) => (s.kind ?? "LESSON") === "ETUT")
                  .map((slot) => (
                    <button
                      key={`quick-${day}-${slot.startTime}`}
                      type="button"
                      className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[10px] text-gray-700 hover:border-indigo-300 hover:bg-indigo-50"
                      onClick={() =>
                        openAdd("club", {
                          dayOfWeek: day,
                          startTime: slot.startTime,
                          endTime: slot.endTime,
                        })
                      }
                    >
                      {DAY_NAMES[day].slice(0, 3)} {slot.label}
                    </button>
                  ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Düzenle */}
      <Dialog
        open={!!editItem}
        onOpenChange={(open) => {
          if (!open) setEditItem(null)
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Atamayı düzenle</DialogTitle>
            <DialogDescription>
              {editItem
                ? `${DAY_NAMES[editItem.dayOfWeek]} · ${editItem.startTime}–${editItem.endTime} · ${editItem.subjectName}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4">
              {editItem.kind === "club" && editItem.assignmentKey && (
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={async () => {
                      const ok = await postAction({
                        action: "exclude_day",
                        assignmentKey: editItem.assignmentKey,
                      })
                      if (ok) setEditItem(null)
                    }}
                  >
                    Yalnızca bu günden çıkar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="text-red-700 border-red-200"
                    disabled={busy}
                    onClick={async () => {
                      if (
                        !confirm(
                          "Öğrenci bu kulüp grubundan tamamen çıkarılsın mı?"
                        )
                      ) {
                        return
                      }
                      const ok = await postAction({
                        action: "leave_group",
                        assignmentKey: editItem.assignmentKey,
                      })
                      if (ok) setEditItem(null)
                    }}
                  >
                    Kulüp grubundan tamamen çıkar
                  </Button>
                </div>
              )}

              {editItem.kind === "study" && editItem.studyGroupId && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full text-red-700 border-red-200"
                  disabled={busy}
                  onClick={async () => {
                    if (!confirm("Öğrenci bu ÖÇG grubundan çıkarılsın mı?")) return
                    const ok = await postAction({
                      action: "leave_study_group",
                      studyGroupId: editItem.studyGroupId,
                    })
                    if (ok) setEditItem(null)
                  }}
                >
                  ÖÇG grubundan çıkar
                </Button>
              )}

              <div className="rounded-xl border border-gray-200 p-3 space-y-3">
                <p className="text-sm font-semibold">Başka kulüp grubuna taşı</p>
                <select
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                  value={selectedClubGroupId}
                  onChange={(e) => setSelectedClubGroupId(e.target.value)}
                >
                  <option value="">Kulüp grubu seçin</option>
                  {(slotFilter ? filteredClubGroups : clubGroups).map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.clubName} · {g.name} ({g.studentCount} öğr.)
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  disabled={busy || !selectedClubGroupId}
                  onClick={() => void moveFromEdit("club")}
                >
                  Kulübe taşı
                </Button>
              </div>

              <div className="rounded-xl border border-gray-200 p-3 space-y-3">
                <p className="text-sm font-semibold">ÖÇG grubuna taşı / al</p>
                <select
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                  value={selectedStudyGroupId}
                  onChange={(e) => setSelectedStudyGroupId(e.target.value)}
                >
                  <option value="">ÖÇG seçin</option>
                  {(slotFilter ? filteredStudyGroups : studyGroups).map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.studentCount} öğr. · {g.sessionCount} oturum)
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  disabled={busy || !selectedStudyGroupId}
                  onClick={() => void moveFromEdit("study")}
                >
                  ÖÇG’ye taşı
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Ekle */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {addTarget === "club" ? "Kulüp grubuna ekle" : "ÖÇG grubuna ekle"}
            </DialogTitle>
            <DialogDescription>
              {slotFilter
                ? `${DAY_NAMES[slotFilter.dayOfWeek]} · ${slotFilter.startTime}–${slotFilter.endTime} için uygun gruplar listelenir.`
                : "Öğrencinin sınıf düzeyine uygun gruplar."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={addTarget === "club" ? "default" : "outline"}
                onClick={() => setAddTarget("club")}
              >
                Kulüp
              </Button>
              <Button
                type="button"
                size="sm"
                variant={addTarget === "study" ? "default" : "outline"}
                onClick={() => setAddTarget("study")}
              >
                ÖÇG
              </Button>
            </div>
            {addTarget === "club" ? (
              <div className="space-y-1.5">
                <Label>Kulüp grubu</Label>
                <select
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                  value={selectedClubGroupId}
                  onChange={(e) => setSelectedClubGroupId(e.target.value)}
                >
                  <option value="">Seçiniz</option>
                  {(slotFilter ? filteredClubGroups : clubGroups).map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.clubName} · {g.name}
                    </option>
                  ))}
                </select>
                {slotFilter && filteredClubGroups.length === 0 && (
                  <p className="text-xs text-amber-800">
                    Bu saatte programı olan kulüp grubu yok. Filtreyi kaldırmak için tekrar “Kulübe
                    al” kullanın.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>ÖÇG grubu</Label>
                <select
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                  value={selectedStudyGroupId}
                  onChange={(e) => setSelectedStudyGroupId(e.target.value)}
                >
                  <option value="">Seçiniz</option>
                  {(slotFilter ? filteredStudyGroups : studyGroups).map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                İptal
              </Button>
              <Button type="button" disabled={busy} onClick={() => void submitAdd()}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kaydet"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
