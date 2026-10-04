"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Plus, Trash2 } from "lucide-react"
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
import {
  DAY_NAMES,
  DENEME_SINAVI_SUBJECT,
  WEEKDAY_INDEXES,
} from "@/lib/schedules/lesson-slots"

type EtutSlot = {
  label: string
  startTime: string
  endTime: string
  band: string
}

export type GradeEtutExamItem = {
  id: string
  grade: number
  dayOfWeek: number
  startTime: string
  endTime: string
  title: string
  notes: string | null
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged?: () => void
}

export function GradeEtutExamsDialog({ open, onOpenChange, onChanged }: Props) {
  const [exams, setExams] = useState<GradeEtutExamItem[]>([])
  const [etutSlots, setEtutSlots] = useState<EtutSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [grade, setGrade] = useState(12)
  const [dayOfWeek, setDayOfWeek] = useState(2)
  const [title, setTitle] = useState(DENEME_SINAVI_SUBJECT)
  const [allSlots, setAllSlots] = useState(true)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])

  const bandSlots = useMemo(() => {
    const band = grade <= 8 ? "ortaokul" : "lise"
    const filtered = etutSlots.filter((s) => s.band === band)
    return filtered.length > 0 ? filtered : etutSlots
  }, [etutSlots, grade])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/schedules/grade-etut-exams", { cache: "no-store" })
      if (!res.ok) throw new Error("fail")
      const data = await res.json()
      setExams(Array.isArray(data.exams) ? data.exams : [])
      setEtutSlots(Array.isArray(data.etutSlots) ? data.etutSlots : [])
    } catch {
      setExams([])
      setEtutSlots([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  useEffect(() => {
    setSelectedKeys(bandSlots.map((s) => `${s.startTime}|${s.endTime}`))
  }, [bandSlots])

  const toggleSlot = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  const save = async () => {
    setSaving(true)
    try {
      const slots = allSlots
        ? undefined
        : bandSlots
            .filter((s) => selectedKeys.includes(`${s.startTime}|${s.endTime}`))
            .map((s) => ({ startTime: s.startTime, endTime: s.endTime }))

      if (!allSlots && (!slots || slots.length === 0)) {
        alert("En az bir etüt saati seçin.")
        return
      }

      const res = await fetch("/api/schedules/grade-etut-exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade,
          dayOfWeek,
          title: title.trim() || DENEME_SINAVI_SUBJECT,
          allEtutSlots: allSlots,
          slots,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data.error || "Kaydedilemedi")
        return
      }
      await load()
      onChanged?.()
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm("Bu deneme bloğunu kaldırmak istiyor musunuz?")) return
    const res = await fetch(`/api/schedules/grade-etut-exams/${id}`, { method: "DELETE" })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(data.error || "Silinemedi")
      return
    }
    await load()
    onChanged?.()
  }

  const removeDayGrade = async (g: number, day: number) => {
    const rows = exams.filter((e) => e.grade === g && e.dayOfWeek === day)
    if (rows.length === 0) return
    if (
      !confirm(
        `${g}. sınıf · ${DAY_NAMES[day]} için ${rows.length} etüt denemesini kaldırmak istiyor musunuz?`
      )
    ) {
      return
    }
    for (const row of rows) {
      await fetch(`/api/schedules/grade-etut-exams/${row.id}`, { method: "DELETE" })
    }
    await load()
    onChanged?.()
  }

  const grouped = useMemo(() => {
    const map = new Map<string, GradeEtutExamItem[]>()
    for (const e of exams) {
      const key = `${e.grade}|${e.dayOfWeek}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    return [...map.entries()].sort((a, b) => {
      const [ga, da] = a[0].split("|").map(Number)
      const [gb, db] = b[0].split("|").map(Number)
      return ga - gb || da - db
    })
  }, [exams])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sınıf düzeyi etüt denemesi</DialogTitle>
          <DialogDescription>
            Örn. tüm 12. sınıfların Salı etüt saatlerini deneme sınavı olarak işaretleyin.
            Kulüp / ÖÇG bu saatlere o düzey için atanamaz.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4 space-y-3">
            <p className="text-sm font-semibold text-rose-950">Yeni deneme bloğu</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Sınıf düzeyi</Label>
                <select
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                  value={grade}
                  onChange={(e) => setGrade(parseInt(e.target.value, 10))}
                >
                  {[5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                    <option key={g} value={g}>
                      {g}. Sınıf
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Gün</Label>
                <select
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(parseInt(e.target.value, 10))}
                >
                  {WEEKDAY_INDEXES.map((d) => (
                    <option key={d} value={d}>
                      {DAY_NAMES[d]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Başlık</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={DENEME_SINAVI_SUBJECT}
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={allSlots}
                onChange={(e) => setAllSlots(e.target.checked)}
              />
              O günün tüm etüt saatleri
            </label>
            {!allSlots && (
              <div className="space-y-2">
                <p className="text-xs text-gray-600">Etüt saatleri</p>
                {bandSlots.length === 0 ? (
                  <p className="text-sm text-amber-800">
                    Tanımlı etüt yok. Önce Ders saatleri’nden ekleyin.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {bandSlots.map((s) => {
                      const key = `${s.startTime}|${s.endTime}`
                      const on = selectedKeys.includes(key)
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => toggleSlot(key)}
                          className={`rounded-lg border px-2.5 py-1.5 text-xs transition ${
                            on
                              ? "border-rose-400 bg-rose-100 text-rose-950"
                              : "border-gray-200 bg-white text-gray-600"
                          }`}
                        >
                          {s.label} · {s.startTime}–{s.endTime}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end">
              <Button type="button" size="sm" onClick={() => void save()} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Kaydet
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-900">Mevcut bloklar</p>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-6 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
                Yükleniyor...
              </div>
            ) : grouped.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">
                Henüz sınıf düzeyi deneme yok
              </p>
            ) : (
              <div className="space-y-2">
                {grouped.map(([key, rows]) => {
                  const [g, d] = key.split("|").map(Number)
                  return (
                    <div
                      key={key}
                      className="rounded-xl border border-gray-200 bg-white p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {g}. Sınıf · {DAY_NAMES[d]}
                          </p>
                          <p className="text-xs text-gray-500">
                            {rows[0]?.title || DENEME_SINAVI_SUBJECT}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="text-red-700 border-red-200 hover:bg-red-50"
                          onClick={() => void removeDayGrade(g, d)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Günü sil
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {rows.map((row) => (
                          <button
                            key={row.id}
                            type="button"
                            onClick={() => void remove(row.id)}
                            className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-900 hover:border-rose-400"
                            title="Bu saati kaldır"
                          >
                            {row.startTime}–{row.endTime}
                            <Trash2 className="h-3 w-3 opacity-60" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
