"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/toast"
import { Loader2 } from "lucide-react"

type Year = {
  id: string
  name: string
  isActive: boolean
  startDate: string | null
  endDate: string | null
  weekendDays: string[]
  term1Start: string | null
  term1End: string | null
  term2Start: string | null
  term2End: string | null
}

type Holiday = {
  id: string
  name: string
  type: string
  startDate: string
  endDate: string
  blocksTeaching: boolean
  description: string | null
}

const TYPES = [
  { id: "RESMI_TATIL", label: "Resmi tatil" },
  { id: "YARILYIL_TATILI", label: "Yarıyıl / sömestır" },
  { id: "ARA_TATIL", label: "Ara tatil" },
  { id: "SINAV_DONEMI", label: "Sınav dönemi" },
  { id: "OZEL_DONEM", label: "Özel dönem" },
  { id: "DIGER", label: "Diğer" },
]

function day(iso: string | null) {
  if (!iso) return ""
  return iso.slice(0, 10)
}

export default function AkademikTakvimPage() {
  const { success, error } = useToast()
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState<Year | null>(null)
  const [years, setYears] = useState<Array<{ id: string; name: string; isActive: boolean }>>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [form, setForm] = useState({
    name: "",
    type: "RESMI_TATIL",
    startDate: "",
    endDate: "",
    blocksTeaching: true,
  })
  const [editingId, setEditingId] = useState<string | null>(null)

  const load = useCallback(async (academicYearId?: string) => {
    setLoading(true)
    try {
      const q = academicYearId ? `?academicYearId=${academicYearId}` : ""
      const res = await fetch(`/api/neredeyiz/academic-calendar${q}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Yüklenemedi")
      setYear(data.year)
      setYears(data.years || [])
      setHolidays(data.holidays || [])
    } catch (e) {
      error(e instanceof Error ? e.message : "Takvim yüklenemedi")
    } finally {
      setLoading(false)
    }
  }, [error])

  useEffect(() => {
    void load()
  }, [load])

  async function saveStructure() {
    if (!year) return
    const res = await fetch(`/api/neredeyiz/academic-years/${year.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: year.name,
        isActive: year.isActive,
        startDate: day(year.startDate),
        endDate: day(year.endDate),
        term1Start: day(year.term1Start),
        term1End: day(year.term1End),
        term2Start: day(year.term2Start),
        term2End: day(year.term2End),
        weekendDays: year.weekendDays,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      error(data.error || "Kaydedilemedi")
      return
    }
    success("Takvim iskeleti kaydedildi")
    void load(year.id)
  }

  function toggleWeekend(dayName: "SATURDAY" | "SUNDAY") {
    if (!year) return
    const has = year.weekendDays.includes(dayName)
    setYear({
      ...year,
      weekendDays: has
        ? year.weekendDays.filter((d) => d !== dayName)
        : [...year.weekendDays, dayName],
    })
  }

  async function saveHoliday() {
    if (!year || !form.name || !form.startDate || !form.endDate) {
      error("Ad ve tarihler zorunlu")
      return
    }
    const payload = {
      academicYearId: year.id,
      ...form,
    }
    const res = await fetch(
      editingId ? `/api/neredeyiz/holidays/${editingId}` : "/api/neredeyiz/holidays",
      {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    )
    const data = await res.json()
    if (!res.ok) {
      error(data.error || "Tatil kaydedilemedi")
      return
    }
    success(editingId ? "Güncellendi" : "Eklendi")
    setEditingId(null)
    setForm({ name: "", type: "RESMI_TATIL", startDate: "", endDate: "", blocksTeaching: true })
    void load(year.id)
  }

  async function removeHoliday(id: string) {
    if (!year) return
    const res = await fetch(`/api/neredeyiz/holidays/${id}`, { method: "DELETE" })
    if (!res.ok) {
      error("Silinemedi")
      return
    }
    success("Silindi")
    void load(year.id)
  }

  if (loading && !year) {
    return (
      <div className="p-6 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Akademik Takvim</h1>
          <p className="text-sm text-gray-600">Okul geneli. Tüm sınıflar bu takvimi miras alır.</p>
        </div>
        <Link href="/yonetim/ayarlar" className="text-sm text-blue-700 underline">
          Yıl ayarları
        </Link>
      </div>

      <div className="flex gap-2 flex-wrap">
        {years.map((y) => (
          <Button
            key={y.id}
            size="sm"
            variant={year?.id === y.id ? "default" : "outline"}
            onClick={() => void load(y.id)}
          >
            {y.name}
            {y.isActive ? " (aktif)" : ""}
          </Button>
        ))}
      </div>

      {!year ? (
        <p>Akademik yıl yok. Önce Ayarlar’dan yıl oluşturun.</p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{year.name}</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-3">
              {(
                [
                  ["startDate", "Yıl başlangıç"],
                  ["endDate", "Yıl bitiş"],
                  ["term1Start", "1. dönem başlangıç"],
                  ["term1End", "1. dönem bitiş"],
                  ["term2Start", "2. dönem başlangıç"],
                  ["term2End", "2. dönem bitiş"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <Input
                    type="date"
                    value={day(year[key])}
                    onChange={(e) =>
                      setYear({ ...year, [key]: e.target.value ? `${e.target.value}T00:00:00.000Z` : null })
                    }
                  />
                </div>
              ))}
              <div className="sm:col-span-2 flex gap-4 items-center">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={year.weekendDays.includes("SATURDAY")}
                    onChange={() => toggleWeekend("SATURDAY")}
                  />
                  Cumartesi tatil
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={year.weekendDays.includes("SUNDAY")}
                    onChange={() => toggleWeekend("SUNDAY")}
                  />
                  Pazar tatil
                </label>
                <Button size="sm" onClick={() => void saveStructure()}>
                  İskeleti kaydet
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tatil ve özel dönemler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-2">
                <Input
                  placeholder="Ad (Kurban Bayramı, yazılı haftası…)"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <select
                  className="h-10 border rounded-md px-2 text-sm"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  {TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={form.blocksTeaching}
                    onChange={(e) => setForm({ ...form, blocksTeaching: e.target.checked })}
                  />
                  Bu aralıkta konu işlenmez
                </label>
              </div>
              <Button size="sm" onClick={() => void saveHoliday()}>
                {editingId ? "Güncelle" : "Ekle"}
              </Button>

              <ul className="divide-y">
                {holidays.map((h) => (
                  <li key={h.id} className="py-2 flex items-center justify-between gap-2 text-sm">
                    <div>
                      <span className="font-medium">{h.name}</span>
                      <span className="text-gray-500">
                        {" "}
                        · {TYPES.find((t) => t.id === h.type)?.label || h.type} · {day(h.startDate)} – {day(h.endDate)}
                        {h.blocksTeaching ? " · işlenemez" : ""}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingId(h.id)
                          setForm({
                            name: h.name,
                            type: h.type,
                            startDate: day(h.startDate),
                            endDate: day(h.endDate),
                            blocksTeaching: h.blocksTeaching,
                          })
                        }}
                      >
                        Düzenle
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void removeHoliday(h.id)}>
                        Sil
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
