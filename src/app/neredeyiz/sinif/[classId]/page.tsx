"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"
import { ArrowDown, ArrowUp, Check, Loader2, Pencil, Trash2, X } from "lucide-react"

type Evaluation = {
  state:
    | "PLANLANDI"
    | "DEVAM_EDIYOR"
    | "ONAY_BEKLIYOR"
    | "TAMAMLANDI"
    | "ERKEN_TAMAMLANDI"
    | "GECIKMELI_TAMAMLANDI"
    | "GECIKMELI"
    | "ERTELENDI"
  delayDays: number
  earlyDays: number
  teachingDaysUntilDue: number | null
}
type Topic = {
  id: string
  name: string
  order: number
  plannedStartDate: string | null
  plannedEndDate: string | null
  evaluation?: Evaluation
}
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
type YearInfo = { name: string; startDate: string | null; endDate: string | null }

function day(iso: string | null | undefined) {
  return iso ? iso.slice(0, 10) : ""
}

const STATE_LABEL: Record<Evaluation["state"], { label: string; cls: string }> = {
  PLANLANDI: { label: "Planlandı", cls: "bg-blue-50 text-blue-700" },
  DEVAM_EDIYOR: { label: "Devam ediyor", cls: "bg-yellow-50 text-yellow-800" },
  ONAY_BEKLIYOR: { label: "Onay bekliyor", cls: "bg-orange-50 text-orange-700" },
  TAMAMLANDI: { label: "Tamamlandı", cls: "bg-green-50 text-green-700" },
  ERKEN_TAMAMLANDI: { label: "Erken tamamlandı", cls: "bg-green-50 text-green-700" },
  GECIKMELI_TAMAMLANDI: { label: "Gecikmeli tamamlandı", cls: "bg-red-50 text-red-700" },
  GECIKMELI: { label: "Gecikmeli", cls: "bg-red-100 text-red-800" },
  ERTELENDI: { label: "Ertelendi", cls: "bg-gray-100 text-gray-700" },
}

function StateBadge({ ev }: { ev?: Evaluation }) {
  if (!ev) return null
  const meta = STATE_LABEL[ev.state]
  const extra =
    ev.delayDays > 0
      ? ` · ${ev.delayDays} ders günü`
      : ev.earlyDays > 0
        ? ` · ${ev.earlyDays} ders günü erken`
        : ev.teachingDaysUntilDue != null && ev.state !== "PLANLANDI"
          ? ` · ${ev.teachingDaysUntilDue} ders günü kaldı`
          : ""
  return <span className={`rounded px-2 py-0.5 text-[11px] whitespace-nowrap ${meta.cls}`}>{meta.label + extra}</span>
}

export default function SinifPlanWorkspacePage() {
  const params = useParams<{ classId: string }>()
  const search = useSearchParams()
  const { success, error, info } = useToast()
  const classId = params.classId
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [className, setClassName] = useState("")
  const [year, setYear] = useState<YearInfo | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [disruptions, setDisruptions] = useState<Disruption[]>([])
  const [siblings, setSiblings] = useState<Sibling[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(search.get("subjectId"))
  const [unitName, setUnitName] = useState("")
  const [newTopic, setNewTopic] = useState<Record<string, { name: string; start: string; end: string }>>({})
  const [editingUnit, setEditingUnit] = useState<{ id: string; name: string } | null>(null)
  const [editingTopic, setEditingTopic] = useState<{ id: string; name: string; start: string; end: string } | null>(null)
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
      setYear(data.class.academicYear ?? null)
      setSubjects(data.subjects || [])
      setHolidays(data.holidays || [])
      setDisruptions(data.disruptions || [])
      setSiblings(data.siblingClasses || [])
      setSelectedId((cur) => (cur && data.subjects?.some((s: Subject) => s.id === cur) ? cur : data.subjects?.[0]?.id || null))
    } catch (e) {
      error(e instanceof Error ? e.message : "Plan yüklenemedi")
    } finally {
      setLoading(false)
    }
  }, [classId, error])

  useEffect(() => {
    void load()
  }, [load])

  function patchDraft(unitId: string, patch: Partial<{ name: string; start: string; end: string }>) {
    setNewTopic((cur) => ({ ...cur, [unitId]: { ...(cur[unitId] ?? { name: "", start: "", end: "" }), ...patch } }))
  }

  const selected = useMemo(() => subjects.find((s) => s.id === selectedId) || null, [subjects, selectedId])
  const minDay = day(year?.startDate)
  const maxDay = day(year?.endDate)

  /** API çağrısı + hata/uyarı bildirimi; başarılıysa planı yeniler. */
  async function call(url: string, method: string, body?: unknown, okMessage?: string): Promise<boolean> {
    setBusy(true)
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        error((data as { error?: string }).error || "İşlem başarısız")
        return false
      }
      if (okMessage) success(okMessage)
      const warning = (data as { warning?: string | null }).warning
      if (warning) info(warning)
      await load()
      return true
    } finally {
      setBusy(false)
    }
  }

  async function addUnit() {
    if (!selected || !unitName.trim()) return
    if (await call("/api/neredeyiz/units", "POST", { subjectId: selected.id, name: unitName.trim() }, "Ünite eklendi")) {
      setUnitName("")
    }
  }

  async function addTopic(unitId: string) {
    const draft = newTopic[unitId]
    if (!draft?.name.trim()) return
    const ok = await call(
      "/api/neredeyiz/topics",
      "POST",
      { unitId, name: draft.name.trim(), plannedStartDate: draft.start || null, plannedEndDate: draft.end || null },
      "Konu eklendi",
    )
    if (ok) setNewTopic((cur) => ({ ...cur, [unitId]: { name: "", start: draft.end, end: "" } }))
  }

  async function saveTopic() {
    if (!editingTopic) return
    const ok = await call(
      `/api/neredeyiz/topics/${editingTopic.id}`,
      "PUT",
      {
        name: editingTopic.name,
        plannedStartDate: editingTopic.start || null,
        plannedEndDate: editingTopic.end || null,
      },
      "Konu güncellendi",
    )
    if (ok) setEditingTopic(null)
  }

  async function saveUnit() {
    if (!editingUnit) return
    if (await call(`/api/neredeyiz/units/${editingUnit.id}`, "PUT", { name: editingUnit.name }, "Ünite güncellendi")) {
      setEditingUnit(null)
    }
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
    if (
      !window.confirm(
        "Seçilen derslerin bu sınıftaki üniteleri ve konuları kaynak sınıftakilerle değiştirilecek. " +
          "İlerleme kaydı olan dersler korunur ve atlanır. Devam edilsin mi?",
      )
    ) {
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`/api/neredeyiz/classes/${classId}/copy-curriculum`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceClassId, subjectIds: picked.length ? picked : undefined, includeDates }),
      })
      const data = await res.json()
      if (!res.ok) {
        error(data.error || "Kopyalanamadı")
        return
      }
      const skipped = (data.skipped ?? []) as Array<{ name: string; reason: string }>
      success(`${data.copiedSubjectIds?.length ?? 0} ders kopyalandı`)
      if (skipped.length) info(`Atlanan: ${skipped.map((s) => `${s.name} (${s.reason})`).join(", ")}`)
      setCopyOpen(false)
      await load()
    } finally {
      setBusy(false)
    }
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
          {year && (
            <p className="text-xs text-gray-500">
              {year.name}
              {minDay && maxDay ? ` · ${minDay} – ${maxDay}` : " · takvim tarihleri tanımlı değil"}
            </p>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => setCopyOpen((v) => !v)}>
          Müfredat kopyala
        </Button>
      </div>

      {(blocked.length > 0 || disruptions.length > 0) && (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="text-gray-500 self-center">Gecikme hesabında sayılmayan günler:</span>
          {blocked.map((h) => (
            <span key={h.id} className="rounded bg-amber-100 px-2 py-1">
              {h.name} {day(h.startDate)}–{day(h.endDate)}
            </span>
          ))}
          {disruptions.map((d) => (
            <span key={d.id} className="rounded bg-red-100 px-2 py-1">
              Aksama: {d.reason} {day(d.startDate)}–{day(d.endDate)}
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
                      setPicked((cur) => (e.target.checked ? [...cur, s.id] : cur.filter((id) => id !== s.id)))
                    }
                  />
                  {s.name}
                </label>
              ))}
            </div>
            <label className="text-sm flex items-center gap-2">
              <input type="checkbox" checked={includeDates} onChange={(e) => setIncludeDates(e.target.checked)} />
              Planlanan tarihleri de kopyala (aynı akademik yıldaki sınıflar için)
            </label>
            <Button size="sm" disabled={busy || !sourceClassId} onClick={() => void copyCurriculum()}>
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
                Bu sınıfın ders programında henüz ders yok. Ders programına eklenen her ders burada otomatik görünür.
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
                  {" · "}
                  {s.units.reduce((n, u) => n + u.topics.length, 0)} konu
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
                {selected.units.map((u, ui) => (
                  <div key={u.id} className="border rounded-md p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      {editingUnit?.id === u.id ? (
                        <>
                          <Input
                            value={editingUnit.name}
                            onChange={(e) => setEditingUnit({ ...editingUnit, name: e.target.value })}
                            className="h-8"
                          />
                          <Button size="sm" variant="ghost" disabled={busy} onClick={() => void saveUnit()} title="Kaydet">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingUnit(null)} title="Vazgeç">
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <p className="font-medium text-sm flex-1">
                            {ui + 1}. {u.name}
                          </p>
                          <Button size="sm" variant="ghost" disabled={busy || ui === 0} title="Yukarı"
                            onClick={() => void call(`/api/neredeyiz/units/${u.id}`, "PUT", { order: selected.units[ui - 1]!.order })}>
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" disabled={busy || ui === selected.units.length - 1} title="Aşağı"
                            onClick={() => void call(`/api/neredeyiz/units/${u.id}`, "PUT", { order: selected.units[ui + 1]!.order })}>
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" title="Adını değiştir" onClick={() => setEditingUnit({ id: u.id, name: u.name })}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-600" disabled={busy} title="Sil"
                            onClick={() => {
                              if (window.confirm(`"${u.name}" ünitesi ve ${u.topics.length} konusu (ilerleme kayıtlarıyla) silinecek. Emin misiniz?`)) {
                                void call(`/api/neredeyiz/units/${u.id}`, "DELETE", undefined, "Ünite silindi")
                              }
                            }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>

                    <ul className="space-y-1">
                      {u.topics.map((t, ti) => (
                        <li key={t.id} className="flex flex-wrap items-center gap-2 text-sm border-t pt-1">
                          {editingTopic?.id === t.id ? (
                            <>
                              <Input className="h-8 flex-1 min-w-[160px]" value={editingTopic.name}
                                onChange={(e) => setEditingTopic({ ...editingTopic, name: e.target.value })} />
                              <Input type="date" className="h-8 w-[150px]" min={minDay} max={maxDay} value={editingTopic.start}
                                onChange={(e) => setEditingTopic({ ...editingTopic, start: e.target.value })} />
                              <Input type="date" className="h-8 w-[150px]" min={editingTopic.start || minDay} max={maxDay} value={editingTopic.end}
                                onChange={(e) => setEditingTopic({ ...editingTopic, end: e.target.value })} />
                              <Button size="sm" variant="ghost" disabled={busy} onClick={() => void saveTopic()} title="Kaydet">
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingTopic(null)} title="Vazgeç">
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <span className="flex-1 min-w-[160px]">{t.name}</span>
                              <span className="text-xs text-gray-500 whitespace-nowrap">
                                {t.plannedStartDate || t.plannedEndDate
                                  ? `${day(t.plannedStartDate) || "?"} → ${day(t.plannedEndDate) || "?"}`
                                  : "tarih yok"}
                              </span>
                              <StateBadge ev={t.evaluation} />
                              <Button size="sm" variant="ghost" disabled={busy || ti === 0} title="Yukarı"
                                onClick={() => void call(`/api/neredeyiz/topics/${t.id}`, "PUT", { order: u.topics[ti - 1]!.order })}>
                                <ArrowUp className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" disabled={busy || ti === u.topics.length - 1} title="Aşağı"
                                onClick={() => void call(`/api/neredeyiz/topics/${t.id}`, "PUT", { order: u.topics[ti + 1]!.order })}>
                                <ArrowDown className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" title="Düzenle"
                                onClick={() => setEditingTopic({ id: t.id, name: t.name, start: day(t.plannedStartDate), end: day(t.plannedEndDate) })}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-red-600" disabled={busy} title="Sil"
                                onClick={() => {
                                  if (window.confirm(`"${t.name}" konusu (ilerleme kaydıyla) silinecek. Emin misiniz?`)) {
                                    void call(`/api/neredeyiz/topics/${t.id}`, "DELETE", undefined, "Konu silindi")
                                  }
                                }}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <Input
                        className="h-8 flex-1 min-w-[160px]"
                        placeholder="Yeni konu"
                        value={newTopic[u.id]?.name ?? ""}
                        onChange={(e) =>
                          patchDraft(u.id, { name: e.target.value })
                        }
                      />
                      <Input type="date" className="h-8 w-[150px]" min={minDay} max={maxDay} title="Planlanan başlangıç"
                        value={newTopic[u.id]?.start ?? ""}
                        onChange={(e) => patchDraft(u.id, { start: e.target.value })} />
                      <Input type="date" className="h-8 w-[150px]" min={newTopic[u.id]?.start || minDay} max={maxDay} title="Planlanan bitiş"
                        value={newTopic[u.id]?.end ?? ""}
                        onChange={(e) => patchDraft(u.id, { end: e.target.value })} />
                      <Button size="sm" disabled={busy} onClick={() => void addTopic(u.id)}>
                        Konu ekle
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="flex gap-2">
                  <Input placeholder="Yeni ünite" value={unitName} onChange={(e) => setUnitName(e.target.value)} />
                  <Button size="sm" disabled={busy} onClick={() => void addUnit()}>
                    Ünite ekle
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
