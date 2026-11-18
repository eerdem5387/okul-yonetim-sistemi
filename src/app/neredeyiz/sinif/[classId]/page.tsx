"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"
import { ArrowDown, ArrowUp, Check, Loader2, Pencil, Trash2, X } from "lucide-react"
import { StateBadge, type WeeklyState } from "@/components/neredeyiz/weekly/shared"

type Topic = {
  id: string
  name: string
  order: number
  plannedStartWeek: number | null
  plannedEndWeek: number | null
  evaluation?: { state: WeeklyState; lateDays: number; rangeLabel: string }
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
type Sibling = { id: string; name: string; grade: number }
type YearInfo = { name: string; startDate: string | null; endDate: string | null }

function day(iso: string | null | undefined) {
  return iso ? iso.slice(0, 10) : ""
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
  const [includeDates, setIncludeDates] = useState(true)
  const [weeks, setWeeks] = useState<Array<{ index: number; label: string }>>([])
  const [grade, setGrade] = useState<number | null>(null)

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
      setWeeks(data.weeks || [])
      setGrade(data.class.grade ?? null)
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
  const weekNum = (v: string) => (v ? Number(v) : null)
  const sameGrade = siblings.filter((s) => grade != null && s.grade === grade)

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
      { unitId, name: draft.name.trim(), plannedStartWeek: weekNum(draft.start), plannedEndWeek: weekNum(draft.end || draft.start) },
      "Konu eklendi",
    )
    // Sonraki konu bir sonraki haftadan başlasın
    const next = draft.end || draft.start ? String(Number(draft.end || draft.start) + 1) : ""
    if (ok) setNewTopic((cur) => ({ ...cur, [unitId]: { name: "", start: next, end: "" } }))
  }

  async function saveTopic() {
    if (!editingTopic) return
    const ok = await call(
      `/api/neredeyiz/topics/${editingTopic.id}`,
      "PUT",
      {
        name: editingTopic.name,
        plannedStartWeek: weekNum(editingTopic.start),
        plannedEndWeek: weekNum(editingTopic.end || editingTopic.start),
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
          "Tamamlanmış konusu olan dersler korunur ve atlanır. Devam edilsin mi?",
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

  /** Bu sınıfın planını aynı düzeydeki diğer şubelere uygular (tamamlanmış konusu olan dersler atlanır). */
  async function applyToGrade() {
    if (!sameGrade.length) return
    if (!window.confirm(`Bu sınıfın yıllık planı ${sameGrade.map((s) => s.name).join(", ")} şubelerine uygulanacak. Tamamlanmış konusu olan dersler atlanır. Devam edilsin mi?`)) return
    setBusy(true)
    let copied = 0
    const skipped: string[] = []
    try {
      for (const target of sameGrade) {
        const res = await fetch(`/api/neredeyiz/classes/${target.id}/copy-curriculum`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceClassId: classId, includeDates: true }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          skipped.push(`${target.name} (${(data as { error?: string }).error ?? "hata"})`)
          continue
        }
        copied++
        for (const s of (data as { skipped?: Array<{ name: string }> }).skipped ?? []) skipped.push(`${target.name} ${s.name}`)
      }
      success(`${copied} şubeye uygulandı`)
      if (skipped.length) info(`Atlanan: ${skipped.join(", ")}`)
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
              {minDay && maxDay ? ` · ${weeks.length} ders haftası` : " · takvim tarihleri tanımlı değil"}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {sameGrade.length > 0 && (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void applyToGrade()}>
              Planı diğer {grade}. sınıf şubelerine uygula
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setCopyOpen((v) => !v)}>
            Başka sınıftan kopyala
          </Button>
        </div>
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
              Planlanan haftaları da kopyala
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
                              <select className="h-8 rounded-md border px-2 text-sm" title="Başlangıç haftası" aria-label="Başlangıç haftası" value={editingTopic.start}
                                onChange={(e) => setEditingTopic({ ...editingTopic, start: e.target.value })}>
                                <option value="">Başlangıç haftası</option>
                                {weeks.map((w) => (
                                  <option key={w.index} value={w.index}>{w.index}. hafta · {w.label}</option>
                                ))}
                              </select>
                              <select className="h-8 rounded-md border px-2 text-sm" title="Bitiş haftası" aria-label="Bitiş haftası" value={editingTopic.end}
                                onChange={(e) => setEditingTopic({ ...editingTopic, end: e.target.value })}>
                                <option value="">Bitiş haftası</option>
                                {weeks.map((w) => (
                                  <option key={w.index} value={w.index}>{w.index}. hafta · {w.label}</option>
                                ))}
                              </select>
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
                                {t.evaluation?.rangeLabel ?? "Hafta girilmedi"}
                              </span>
                              {t.evaluation && (
                                <StateBadge
                                  state={t.evaluation.state}
                                  extra={t.evaluation.lateDays ? `${t.evaluation.lateDays} ders günü` : null}
                                />
                              )}
                              <Button size="sm" variant="ghost" disabled={busy || ti === 0} title="Yukarı"
                                onClick={() => void call(`/api/neredeyiz/topics/${t.id}`, "PUT", { order: u.topics[ti - 1]!.order })}>
                                <ArrowUp className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" disabled={busy || ti === u.topics.length - 1} title="Aşağı"
                                onClick={() => void call(`/api/neredeyiz/topics/${t.id}`, "PUT", { order: u.topics[ti + 1]!.order })}>
                                <ArrowDown className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" title="Düzenle"
                                onClick={() => setEditingTopic({ id: t.id, name: t.name, start: t.plannedStartWeek ? String(t.plannedStartWeek) : "", end: t.plannedEndWeek ? String(t.plannedEndWeek) : "" })}>
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
                      <select className="h-8 rounded-md border px-2 text-sm" title="Başlangıç haftası" aria-label="Başlangıç haftası" value={newTopic[u.id]?.start ?? ""}
                                onChange={(e) => patchDraft(u.id, { start: e.target.value })}>
                                <option value="">Başlangıç haftası</option>
                                {weeks.map((w) => (
                                  <option key={w.index} value={w.index}>{w.index}. hafta · {w.label}</option>
                                ))}
                              </select>
                      <select className="h-8 rounded-md border px-2 text-sm" title="Bitiş haftası" aria-label="Bitiş haftası" value={newTopic[u.id]?.end ?? ""}
                                onChange={(e) => patchDraft(u.id, { end: e.target.value })}>
                                <option value="">Bitiş haftası</option>
                                {weeks.map((w) => (
                                  <option key={w.index} value={w.index}>{w.index}. hafta · {w.label}</option>
                                ))}
                              </select>
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
