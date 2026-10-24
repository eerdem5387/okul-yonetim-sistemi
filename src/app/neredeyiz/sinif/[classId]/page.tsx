"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"
import { Loader2 } from "lucide-react"

type Topic = { id: string; name: string; order: number }
type Unit = { id: string; name: string; order: number; topics: Topic[] }
type Subject = {
  id: string
  name: string
  units: Unit[]
  assignments: Array<{ staff: { firstName: string; lastName: string } }>
}
type Holiday = { id: string; name: string; startDate: string; endDate: string; blocksTeaching: boolean }
type Disruption = { id: string; reason: string; startDate: string; endDate: string; scope: string }
type Sibling = { id: string; name: string }

function day(iso: string) {
  return iso.slice(0, 10)
}

export default function SinifPlanWorkspacePage() {
  const params = useParams<{ classId: string }>()
  const search = useSearchParams()
  const { success, error } = useToast()
  const classId = params.classId
  const [loading, setLoading] = useState(true)
  const [className, setClassName] = useState("")
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [disruptions, setDisruptions] = useState<Disruption[]>([])
  const [siblings, setSiblings] = useState<Sibling[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(search.get("subjectId"))
  const [unitName, setUnitName] = useState("")
  const [topicName, setTopicName] = useState("")
  const [topicUnitId, setTopicUnitId] = useState("")
  const [copyOpen, setCopyOpen] = useState(false)
  const [sourceClassId, setSourceClassId] = useState("")
  const [sourceSubjects, setSourceSubjects] = useState<Array<{ id: string; name: string }>>([])
  const [picked, setPicked] = useState<string[]>([])
  const [includeDates, setIncludeDates] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/neredeyiz/classes/${classId}/plan`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Yüklenemedi")
      setClassName(data.class.name)
      setSubjects(data.subjects || [])
      setHolidays(data.holidays || [])
      setDisruptions(data.disruptions || [])
      setSiblings(data.siblingClasses || [])
      setSelectedId((cur) => cur || data.subjects?.[0]?.id || null)
    } catch (e) {
      error(e instanceof Error ? e.message : "Plan yüklenemedi")
    } finally {
      setLoading(false)
    }
  }, [classId, error])

  useEffect(() => {
    void load()
  }, [load])

  const selected = useMemo(
    () => subjects.find((s) => s.id === selectedId) || null,
    [subjects, selectedId]
  )

  async function addUnit() {
    if (!selected || !unitName.trim()) return
    const res = await fetch("/api/neredeyiz/units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectId: selected.id,
        name: unitName.trim(),
        order: selected.units.length + 1,
      }),
    })
    if (!res.ok) {
      error("Ünite eklenemedi")
      return
    }
    setUnitName("")
    success("Ünite eklendi")
    void load()
  }

  async function addTopic() {
    if (!topicUnitId || !topicName.trim()) return
    const unit = selected?.units.find((u) => u.id === topicUnitId)
    const res = await fetch("/api/neredeyiz/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        unitId: topicUnitId,
        name: topicName.trim(),
        order: (unit?.topics.length || 0) + 1,
      }),
    })
    if (!res.ok) {
      error("Konu eklenemedi")
      return
    }
    setTopicName("")
    success("Konu eklendi")
    void load()
  }

  async function loadSourceSubjects(id: string) {
    setSourceClassId(id)
    setPicked([])
    if (!id) {
      setSourceSubjects([])
      return
    }
    const res = await fetch(`/api/neredeyiz/subjects?classId=${id}`)
    const data = await res.json()
    setSourceSubjects(Array.isArray(data) ? data.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })) : [])
  }

  async function copyCurriculum() {
    if (!sourceClassId) return
    if (!window.confirm("Seçilen derslerin bu sınıftaki ünite/konuları üzerine yazılacak. İlerleme taşınmaz.")) {
      return
    }
    const res = await fetch(`/api/neredeyiz/classes/${classId}/copy-curriculum`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceClassId,
        subjectIds: picked.length ? picked : undefined,
        includeDates,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      error(data.error || "Kopyalanamadı")
      return
    }
    success("Müfredat kopyalandı")
    setCopyOpen(false)
    void load()
  }

  if (loading && !className) {
    return (
      <div className="p-6 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const blocked = holidays.filter((h) => h.blocksTeaching)

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href="/neredeyiz/sinif" className="text-xs text-blue-700 underline">
            Tüm sınıflar
          </Link>
          <h1 className="text-2xl font-bold">{className} yıllık ders planı</h1>
        </div>
        <Button size="sm" onClick={() => setCopyOpen((v) => !v)}>
          Müfredat kopyala
        </Button>
      </div>

      {(blocked.length > 0 || disruptions.length > 0) && (
        <div className="flex flex-wrap gap-2 text-xs">
          {blocked.slice(0, 6).map((h) => (
            <span key={h.id} className="rounded bg-amber-100 px-2 py-1">
              {h.name} {day(h.startDate)}–{day(h.endDate)}
            </span>
          ))}
          {disruptions.slice(0, 4).map((d) => (
            <span key={d.id} className="rounded bg-red-100 px-2 py-1">
              Aksama: {d.reason}
            </span>
          ))}
        </div>
      )}

      {copyOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Başka sınıftan ders içeriği</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <select
              className="h-10 border rounded-md px-2 text-sm w-full max-w-sm"
              value={sourceClassId}
              onChange={(e) => void loadSourceSubjects(e.target.value)}
            >
              <option value="">Kaynak sınıf</option>
              {siblings.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-2">
              {sourceSubjects.map((s) => (
                <label key={s.id} className="text-sm flex items-center gap-1 border rounded px-2 py-1">
                  <input
                    type="checkbox"
                    checked={picked.includes(s.id)}
                    onChange={(e) =>
                      setPicked((cur) =>
                        e.target.checked ? [...cur, s.id] : cur.filter((id) => id !== s.id)
                      )
                    }
                  />
                  {s.name}
                </label>
              ))}
            </div>
            <label className="text-sm flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeDates}
                onChange={(e) => setIncludeDates(e.target.checked)}
              />
              Planlanan tarihleri de kopyala
            </label>
            <Button size="sm" onClick={() => void copyCurriculum()}>
              Kopyala
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-[240px_1fr] gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Dersler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {subjects.length === 0 && (
              <p className="text-xs text-gray-500">
                Ders kabuğu yok. Sınıf oluşturma veya ders programı ekleme kabuk üretir.
              </p>
            )}
            {subjects.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedId(s.id)}
                className={`w-full text-left text-sm rounded px-2 py-1.5 ${
                  selectedId === s.id ? "bg-blue-600 text-white" : "hover:bg-gray-100"
                }`}
              >
                {s.name}
                <span className="block text-[11px] opacity-80">
                  {s.assignments.map((a) => `${a.staff.firstName} ${a.staff.lastName}`).join(", ") || "öğretmen yok"}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{selected?.name || "Ders seçin"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selected && (
              <>
                <div className="flex gap-2">
                  <Input
                    placeholder="Yeni ünite"
                    value={unitName}
                    onChange={(e) => setUnitName(e.target.value)}
                  />
                  <Button size="sm" onClick={() => void addUnit()}>
                    Ünite ekle
                  </Button>
                </div>
                {selected.units.map((u) => (
                  <div key={u.id} className="border rounded-md p-3">
                    <p className="font-medium text-sm">{u.order}. {u.name}</p>
                    <ul className="mt-1 text-sm text-gray-700 list-disc pl-5">
                      {u.topics.map((t) => (
                        <li key={t.id}>{t.name}</li>
                      ))}
                    </ul>
                  </div>
                ))}
                {selected.units.length > 0 && (
                  <div className="flex gap-2">
                    <select
                      className="h-10 border rounded-md px-2 text-sm"
                      value={topicUnitId}
                      onChange={(e) => setTopicUnitId(e.target.value)}
                    >
                      <option value="">Ünite</option>
                      {selected.units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                    <Input
                      placeholder="Yeni konu"
                      value={topicName}
                      onChange={(e) => setTopicName(e.target.value)}
                    />
                    <Button size="sm" onClick={() => void addTopic()}>
                      Konu ekle
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
