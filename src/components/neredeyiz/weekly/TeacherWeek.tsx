"use client"

import { useState } from "react"
import { Check, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/toast"
import { postJson, ReasonPicker, StatCard, useJson, type TopicView } from "./shared"

type WeekResponse = {
  week: { index: number | null; label: string; isBreak: boolean } | null
  summary: { dueCount: number; doneThisWeek: number; lateCount: number }
  cards: Array<{ subjectId: string; className: string; subjectName: string; hasPlan: boolean; topics: TopicView[] }>
}

/** Öğretmen — "Bu hafta": bu hafta biten ve geciken konular; tek dokunuşla Tamamlandı. */
export function TeacherWeek({ onOpenPlan }: { onOpenPlan?: (subjectId: string) => void }) {
  const { success, error } = useToast()
  const { data, error: loadError, loading, reload } = useJson<WeekResponse>("/api/neredeyiz/me/week")
  const [asking, setAsking] = useState<string | null>(null)
  const [reason, setReason] = useState<Record<string, string>>({})
  const [note, setNote] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)

  async function complete(t: TopicView, withReason = false) {
    setBusy(t.id)
    try {
      await postJson(`/api/neredeyiz/topics/${t.id}/completion`, withReason ? { lateReason: reason[t.id], note: note[t.id] || undefined } : {})
      success(withReason ? "Kaydedildi" : "Tamamlandı olarak işaretlendi")
      setAsking(null)
      await reload()
    } catch (e) {
      const needs = (e as { data?: { requiresLateReason?: boolean } }).data?.requiresLateReason
      if (needs) setAsking(t.id)
      else error(e instanceof Error ? e.message : "İşaretlenemedi")
    } finally {
      setBusy(null)
    }
  }

  async function undo(t: TopicView) {
    setBusy(t.id)
    try {
      await postJson(`/api/neredeyiz/topics/${t.id}/completion`, undefined, "DELETE")
      await reload()
    } catch (e) {
      error(e instanceof Error ? e.message : "Geri alınamadı")
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

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[15px] text-gray-600">
        {data.week ? (data.week.isBreak ? `Tatil haftası · ${data.week.label}` : `${data.week.index}. hafta · ${data.week.label}`) : "Akademik yıl dışında"}
      </p>
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Bu hafta biten" value={data.summary.dueCount} />
        <StatCard label="Bu hafta tamamlanan" value={data.summary.doneThisWeek} tone="green" />
        <StatCard label="Gecikmiş" value={data.summary.lateCount} tone={data.summary.lateCount ? "red" : "neutral"} />
      </div>

      {data.cards.length === 0 && (
        <p className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-600">
          Bu hafta için bekleyen konu yok. Zamanında tamamladığınız konular için başka bir şey yapmanız gerekmez.
        </p>
      )}

      {data.cards.map((c) => {
        const hasLate = c.topics.some((t) => t.state === "GECIKTI")
        return (
          <section
            key={c.subjectId}
            className={`flex flex-col gap-3 rounded-2xl border bg-white p-4 ${hasLate ? "border-red-300" : "border-gray-200"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-gray-900 px-2 py-0.5 text-[13px] font-bold text-white">{c.className}</span>
                <span className="text-base font-semibold">{c.subjectName}</span>
              </div>
              {onOpenPlan && (
                <button type="button" onClick={() => onOpenPlan(c.subjectId)} className="min-h-[44px] px-2 text-sm font-semibold text-indigo-700">
                  Yıllık plan
                </button>
              )}
            </div>

            {!c.hasPlan && (
              <p className="text-sm text-gray-600">Bu dersin yıllık planı henüz girilmedi. Plan girildiğinde konular burada görünür.</p>
            )}

            {c.topics.map((t) => {
              const done = t.state === "TAMAMLANDI" || t.state === "GEC_TAMAMLANDI"
              const isAsking = asking === t.id
              const rowCls =
                t.state === "GECIKTI"
                  ? "border-red-200 bg-red-50"
                  : t.state === "GEC_TAMAMLANDI"
                    ? "border-amber-200 bg-amber-50"
                    : done
                      ? "border-green-200 bg-green-50"
                      : "border-gray-200 bg-white"
              const meta = done
                ? `Tamamlandı · ${t.completedOn}${t.lateReasonLabel ? ` · geç (${t.lateReasonLabel})` : ""}`
                : t.state === "GECIKTI"
                  ? `Gecikti · plan: ${t.rangeLabel} · ${t.lateDays} ders günü`
                  : `Plan: ${t.rangeLabel}${t.plannedEndLabel ? ` · son gün ${t.plannedEndLabel}` : ""}`
              return (
                <div key={t.id} className={`flex flex-col gap-3 rounded-xl border p-3 ${rowCls}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="text-[15px] font-semibold">{t.name}</span>
                      <span className={`text-[13px] ${t.state === "GECIKTI" ? "font-semibold text-red-800" : done ? "text-green-800" : "text-gray-600"}`}>
                        {meta}
                      </span>
                    </div>
                    {!done && !isAsking && (
                      <button
                        type="button"
                        disabled={busy === t.id}
                        onClick={() => (t.state === "GECIKTI" ? setAsking(t.id) : void complete(t))}
                        className={`flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold text-white ${
                          t.state === "GECIKTI" ? "bg-red-700" : "bg-indigo-700"
                        }`}
                      >
                        {busy === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                        Tamamlandı
                      </button>
                    )}
                    {done && (
                      <button
                        type="button"
                        disabled={busy === t.id}
                        onClick={() => void undo(t)}
                        className="min-h-[44px] shrink-0 px-2 text-sm font-semibold text-indigo-700"
                      >
                        Geri al
                      </button>
                    )}
                  </div>

                  {isAsking && (
                    <div className="flex flex-col gap-3 border-t border-red-200 pt-3">
                      <p className="text-sm font-semibold">Planlanandan geç tamamlandı. Sebebi nedir?</p>
                      <ReasonPicker value={reason[t.id] ?? null} onChange={(v) => setReason((r) => ({ ...r, [t.id]: v }))} />
                      <label className="flex flex-col gap-1.5 text-[13px] text-gray-700">
                        Not (isteğe bağlı)
                        <input
                          type="text"
                          value={note[t.id] ?? ""}
                          onChange={(e) => setNote((n) => ({ ...n, [t.id]: e.target.value }))}
                          placeholder="Örn. 2 gün raporluydum, telafi yaptım"
                          className="min-h-[44px] rounded-xl border border-gray-300 px-3 text-[15px]"
                        />
                      </label>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setAsking(null)} className="min-h-[44px] rounded-xl border border-gray-300 bg-white px-4 text-sm">
                          Vazgeç
                        </button>
                        <button
                          type="button"
                          disabled={!reason[t.id] || busy === t.id}
                          onClick={() => void complete(t, true)}
                          className="min-h-[44px] flex-1 rounded-xl bg-gray-900 text-sm font-semibold text-white disabled:bg-gray-200 disabled:text-gray-500"
                        >
                          Kaydet
                        </button>
                      </div>
                    </div>
                  )}

                  {t.guidanceNotes.map((n) => (
                    <p key={n.id} className="rounded-lg bg-white/70 px-3 py-2 text-[13px] text-gray-800">
                      <span className="font-semibold">Rehberlik notu:</span> {n.text}
                    </p>
                  ))}
                </div>
              )
            })}
          </section>
        )
      })}

      <p className="text-[13px] leading-relaxed text-gray-600">
        Zamanında tamamladığınız konularda başka bir şey yapmanız gerekmez. Planlanan haftası geçen konular kırmızı görünür;
        tamamladığınızda yalnızca gecikme sebebi sorulur.
      </p>
    </div>
  )
}
