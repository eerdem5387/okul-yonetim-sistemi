"use client"

import { Fragment, useMemo, useState } from "react"
import { CalendarOff, Check, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/toast"
import { postJson, ReasonPicker, Segmented, StateBadge, useJson, type TopicView } from "./shared"

type PlanTopic = TopicView & { plannedStartWeek: number | null; plannedEndWeek: number | null }
type PlanResponse = {
  tabs: Array<{ subjectId: string; className: string; subjectName: string }>
  selected: null | {
    subjectId: string
    className: string
    subjectName: string
    totalTopics: number
    completed: number
    late: number
    unplanned: number
    notes: Array<{ id: string; text: string; createdAt: string }>
  }
  units: Array<{ id: string; name: string; topics: PlanTopic[] }>
  breaks: Array<{ afterWeek: number; label: string }>
  totalWeeks?: number
  week: { index: number | null; label: string; isBreak: boolean } | null
}

type Filter = "all" | "past" | "future"

/** Öğretmen — "Yıllık planım": tüm yıl; geçmişte tamamlananlar, bugün çizgisi, ileride gelenler. */
export function TeacherPlan({ subjectId, onSubjectChange }: { subjectId: string | null; onSubjectChange: (id: string) => void }) {
  const { success, error } = useToast()
  const url = `/api/neredeyiz/me/plan${subjectId ? `?subjectId=${subjectId}` : ""}`
  const { data, error: loadError, loading, reload } = useJson<PlanResponse>(url)
  const [filter, setFilter] = useState<Filter>("all")
  const [asking, setAsking] = useState<string | null>(null)
  const [reason, setReason] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const todayWeek = data?.week?.index ?? null

  /** Liste: ünite başlıkları, konular, tatil ve "bugün" işaretleri; filtreye göre. */
  const rows = useMemo(() => {
    if (!data) return []
    type Row =
      | { kind: "unit"; key: string; label: string }
      | { kind: "topic"; key: string; topic: PlanTopic }
      | { kind: "today"; key: string; label: string }
      | { kind: "break"; key: string; label: string }
    const out: Row[] = []
    let todayPlaced = todayWeek == null
    const breaks = [...data.breaks]
    for (const u of data.units) {
      const topics = u.topics.filter((t) => {
        if (filter === "all") return true
        const past = t.plannedEndWeek != null && todayWeek != null && t.plannedEndWeek < todayWeek
        return filter === "past" ? past || t.state === "TAMAMLANDI" || t.state === "GEC_TAMAMLANDI" : !past || t.state === "GECIKTI"
      })
      if (!topics.length) continue
      out.push({ kind: "unit", key: `u-${u.id}`, label: u.name })
      for (const t of topics) {
        const start = t.plannedStartWeek ?? t.plannedEndWeek
        while (breaks.length && start != null && start > breaks[0]!.afterWeek) {
          const b = breaks.shift()!
          if (b.afterWeek > 0) out.push({ kind: "break", key: `b-${b.afterWeek}`, label: `Tatil · ${b.label} · plana sayılmaz` })
        }
        if (!todayPlaced && start != null && todayWeek != null && start >= todayWeek) {
          out.push({ kind: "today", key: "today", label: `${todayWeek}. hafta · ${data.week!.label}` })
          todayPlaced = true
        }
        out.push({ kind: "topic", key: t.id, topic: t })
      }
    }
    return out
  }, [data, filter, todayWeek])

  async function complete(t: PlanTopic, withReason = false) {
    setBusy(t.id)
    try {
      await postJson(`/api/neredeyiz/topics/${t.id}/completion`, withReason ? { lateReason: reason } : {})
      success("Tamamlandı olarak işaretlendi")
      setAsking(null)
      setReason(null)
      await reload()
    } catch (e) {
      if ((e as { data?: { requiresLateReason?: boolean } }).data?.requiresLateReason) setAsking(t.id)
      else error(e instanceof Error ? e.message : "İşaretlenemedi")
    } finally {
      setBusy(null)
    }
  }

  if (loading && !data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-700" />
      </div>
    )
  }
  if (loadError) return <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{loadError}</p>
  if (!data) return null
  if (!data.selected) {
    return <p className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-600">Bu yıl atandığınız bir ders bulunamadı.</p>
  }

  const s = data.selected
  const pct = (n: number) => (s.totalTopics ? Math.round((n / s.totalTopics) * 100) : 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Ders">
        {data.tabs.map((t) => (
          <button
            key={t.subjectId}
            type="button"
            aria-pressed={t.subjectId === s.subjectId}
            onClick={() => onSubjectChange(t.subjectId)}
            className={`min-h-[40px] shrink-0 rounded-full px-4 text-sm ${
              t.subjectId === s.subjectId ? "border-2 border-indigo-700 bg-indigo-50 font-semibold text-indigo-800" : "border border-gray-300 bg-white"
            }`}
          >
            {t.className} {t.subjectName}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap justify-between gap-2 text-[13px]">
          <span className="font-semibold">
            {s.completed} / {s.totalTopics} konu tamamlandı
          </span>
          <span className={`font-semibold ${s.late ? "text-red-800" : "text-green-800"}`}>
            {s.late ? `${s.late} konu gecikti` : "Gecikme yok"}
            {s.unplanned ? ` · ${s.unplanned} konunun haftası girilmedi` : ""}
          </span>
        </div>
        <div className="flex h-2 overflow-hidden rounded-full bg-gray-200" aria-hidden="true">
          <div className="h-full bg-green-600" style={{ width: `${pct(s.completed)}%` }} />
          <div className="h-full bg-red-700" style={{ width: `${pct(s.late)}%` }} />
        </div>
        {s.notes.map((n) => (
          <p key={n.id} className="rounded-lg bg-indigo-50 px-3 py-2 text-[13px] text-indigo-950">
            <span className="font-semibold">Rehberlik notu:</span> {n.text}
          </p>
        ))}
      </div>

      <Segmented<Filter>
        label="Görünüm"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "Tüm yıl" },
          { value: "past", label: "Geçmiş" },
          { value: "future", label: "Gelecek" },
        ]}
      />

      <div className="flex flex-col gap-2">
        {rows.map((r) => (
          <Fragment key={r.key}>
            {r.kind === "unit" && (
              <h3 className="mx-1 mt-3 text-[13px] font-bold uppercase tracking-wide text-gray-600">{r.label}</h3>
            )}
            {r.kind === "today" && (
              <div className="my-1 flex items-center gap-2" aria-label="Bugün">
                <span className="h-0.5 flex-1 bg-indigo-700" />
                <span className="text-xs font-bold text-indigo-700">BUGÜN · {r.label}</span>
                <span className="h-0.5 flex-1 bg-indigo-700" />
              </div>
            )}
            {r.kind === "break" && (
              <div className="flex items-center gap-2 rounded-xl border border-dashed border-gray-400 px-3 py-2.5 text-[13px] text-gray-700">
                <CalendarOff className="h-4 w-4" aria-hidden="true" />
                {r.label}
              </div>
            )}
            {r.kind === "topic" && (
              <div
                className={`flex flex-col gap-3 rounded-xl p-3 ${
                  r.topic.state === "GECIKTI"
                    ? "border border-red-200 bg-red-50"
                    : r.topic.state === "BU_HAFTA"
                      ? "border-2 border-indigo-300 bg-white"
                      : "border border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className={`text-[15px] ${r.topic.state === "GECIKTI" || r.topic.state === "BU_HAFTA" ? "font-semibold" : "font-medium"}`}>
                      {r.topic.name}
                    </span>
                    <span className="text-xs text-gray-600">
                      Plan: {r.topic.rangeLabel}
                      {r.topic.completedOn ? ` · ${r.topic.completedOn}` : ""}
                      {r.topic.lateReasonLabel ? ` · ${r.topic.lateReasonLabel}` : ""}
                      {r.topic.state === "GECIKTI" ? ` · ${r.topic.lateDays} ders günü` : ""}
                    </span>
                  </div>
                  <StateBadge state={r.topic.state} />
                  {(r.topic.state === "GECIKTI" || r.topic.state === "BU_HAFTA") && asking !== r.topic.id && (
                    <button
                      type="button"
                      aria-label={`${r.topic.name}: Tamamlandı`}
                      disabled={busy === r.topic.id}
                      onClick={() => (r.topic.state === "GECIKTI" ? setAsking(r.topic.id) : void complete(r.topic))}
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white ${r.topic.state === "GECIKTI" ? "bg-red-700" : "bg-indigo-700"}`}
                    >
                      {busy === r.topic.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-5 w-5" />}
                    </button>
                  )}
                </div>
                {asking === r.topic.id && (
                  <div className="flex flex-col gap-3 border-t border-red-200 pt-3">
                    <p className="text-sm font-semibold">Planlanandan geç tamamlandı. Sebebi nedir?</p>
                    <ReasonPicker value={reason} onChange={setReason} />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setAsking(null)} className="min-h-[44px] rounded-xl border border-gray-300 bg-white px-4 text-sm">
                        Vazgeç
                      </button>
                      <button
                        type="button"
                        disabled={!reason || busy === r.topic.id}
                        onClick={() => void complete(r.topic, true)}
                        className="min-h-[44px] flex-1 rounded-xl bg-gray-900 text-sm font-semibold text-white disabled:bg-gray-200 disabled:text-gray-500"
                      >
                        Kaydet
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Fragment>
        ))}
        {rows.length === 0 && <p className="text-sm text-gray-600">Bu görünümde konu yok.</p>}
      </div>
    </div>
  )
}
