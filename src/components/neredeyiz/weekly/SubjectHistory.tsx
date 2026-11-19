"use client"

import Link from "next/link"
import { useState } from "react"
import { ChevronLeft, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/toast"
import { PageShell, postJson, StateBadge, useJson, type TopicView } from "./shared"

type HistoryResponse = {
  subject: { id: string; className: string; subjectName: string; teachers: string[]; counselor: string | null }
  week: { index: number | null; label: string } | null
  counts: { onTime: number; lateDone: number; late: number; thisWeek: number; upcoming: number; unplanned: number }
  topics: Array<TopicView & { completedByName: string | null }>
  notes: Array<{ id: string; topicId: string | null; text: string; createdAt: string; authorName: string | null }>
  events: Array<{ key: string; kind: string; when: string; who: string; text: string }>
}

const EVENT_DOT: Record<string, string> = {
  late: "bg-red-700",
  lateDone: "bg-amber-500",
  disruption: "bg-indigo-700",
  schedule: "bg-gray-500",
}

/** Rehberlik — bir sınıf-dersin konu geçmişi; not bırakma ve hatırlatma. */
export function SubjectHistory({ subjectId, backHref = "/neredeyiz" }: { subjectId: string; backHref?: string }) {
  const { success, error } = useToast()
  const { data, loading, error: loadError, reload } = useJson<HistoryResponse>(`/api/neredeyiz/subjects/${subjectId}/history`)
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)

  async function saveNote() {
    if (!note.trim()) return
    setBusy(true)
    try {
      await postJson(`/api/neredeyiz/subjects/${subjectId}/notes`, { text: note.trim() })
      setNote("")
      success("Not kaydedildi; öğretmene bildirildi")
      await reload()
    } catch (e) {
      error(e instanceof Error ? e.message : "Not kaydedilemedi")
    } finally {
      setBusy(false)
    }
  }

  async function remind() {
    setBusy(true)
    try {
      const res = (await postJson(`/api/neredeyiz/subjects/${subjectId}/remind`)) as { alreadyReminded?: boolean }
      success(res.alreadyReminded ? "Bugün zaten hatırlatılmıştı" : "Öğretmene hatırlatma gönderildi")
    } catch (e) {
      error(e instanceof Error ? e.message : "Hatırlatılamadı")
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageShell>
      <Link href={backHref} className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-indigo-700">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Haftalık panoya dön
      </Link>

      {loadError && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{loadError}</p>}
      {loading && !data && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-700" />
        </div>
      )}

      {data && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-[28px] font-bold tracking-tight">
                {data.subject.className} · {data.subject.subjectName}
              </h1>
              <p className="text-[15px] text-gray-600">
                Öğretmen: {data.subject.teachers.join(", ") || "atanmamış"}
                {data.subject.counselor ? ` · Sınıf rehberi: ${data.subject.counselor}` : ""}
                {data.week?.index ? ` · ${data.week.index}. hafta itibarıyla` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-green-100 px-3.5 py-1.5 text-sm font-semibold text-green-900">{data.counts.onTime} zamanında</span>
              <span className="rounded-full bg-amber-100 px-3.5 py-1.5 text-sm font-semibold text-amber-900">{data.counts.lateDone} geç tamamlandı</span>
              <span className="rounded-full bg-red-100 px-3.5 py-1.5 text-sm font-semibold text-red-900">{data.counts.late} gecikti</span>
            </div>
          </div>

          <section className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
            <div className="min-w-[860px]">
              <div className="grid grid-cols-[minmax(0,1.6fr)_150px_150px_minmax(0,1.8fr)] gap-4 border-b border-gray-200 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
                <span>Konu</span>
                <span>Planlanan</span>
                <span>Tamamlanma</span>
                <span>Durum</span>
              </div>
              {data.topics.map((t) => (
                <div
                  key={t.id}
                  className={`grid grid-cols-[minmax(0,1.6fr)_150px_150px_minmax(0,1.8fr)] items-center gap-4 border-b border-gray-100 px-5 py-3.5 ${
                    t.state === "GECIKTI" ? "bg-red-50" : t.state === "GEC_TAMAMLANDI" ? "bg-amber-50" : ""
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[15px] font-medium">{t.name}</span>
                    <span className="text-xs text-gray-600">{t.unitName}</span>
                  </div>
                  <span className="text-sm text-gray-700">{t.rangeLabel}</span>
                  <span className="text-sm text-gray-700">{t.completedOn ?? "—"}</span>
                  <div className="flex flex-col items-start gap-1">
                    <StateBadge state={t.state} />
                    <span className="text-[13px] text-gray-600">
                      {t.state === "GECIKTI"
                        ? `${t.plannedEndLabel ?? ""} bitmeliydi · ${t.lateDays} ders günü gecikti`
                        : t.state === "GEC_TAMAMLANDI"
                          ? `${t.lateDays} ders günü geç · ${t.lateReasonLabel ?? ""}${t.note ? ` · "${t.note}"` : ""}`
                          : t.state === "BU_HAFTA" && t.plannedEndLabel
                            ? `Son gün ${t.plannedEndLabel}`
                            : ""}
                    </span>
                  </div>
                </div>
              ))}
              {data.topics.length === 0 && <p className="p-6 text-center text-sm text-gray-600">Bu dersin yıllık planı henüz girilmedi.</p>}
            </div>
          </section>

          <div className="flex flex-wrap items-start gap-5">
            <section className="flex min-w-0 flex-[999_1_520px] flex-col rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="mb-2 text-lg font-bold">Olaylar ve notlar</h2>
              {[...data.notes.map((n) => ({ key: n.createdAt, dot: "bg-indigo-700", when: new Date(n.createdAt).toLocaleDateString("tr-TR"), who: n.authorName ?? "Rehberlik", text: n.text })),
                ...data.events.map((e) => ({ key: e.key, dot: EVENT_DOT[e.kind] ?? "bg-gray-500", when: e.when, who: e.who, text: e.text }))]
                .sort((a, b) => b.key.localeCompare(a.key))
                .map((e, i) => (
                  <div key={i} className="flex gap-3 border-t border-gray-100 py-3">
                    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${e.dot}`} aria-hidden="true" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[13px] text-gray-600">
                        {e.when} · {e.who}
                      </span>
                      <span className="text-sm leading-relaxed">{e.text}</span>
                    </div>
                  </div>
                ))}
              {data.notes.length + data.events.length === 0 && <p className="text-sm text-gray-600">Henüz olay yok.</p>}
            </section>

            <section className="flex flex-[1_1_320px] flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="text-lg font-bold">Rehberlik notu</h2>
              <label htmlFor="rehberlik-notu" className="text-[13px] text-gray-700">
                Öğretmenin göreceği kısa not
              </label>
              <textarea
                id="rehberlik-notu"
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Örn. Telafi için Cuma 8. saat uygun."
                className="resize-y rounded-xl border border-gray-300 px-3 py-2.5 text-[15px]"
              />
              <button
                type="button"
                disabled={busy || !note.trim()}
                onClick={() => void saveNote()}
                className="min-h-[44px] rounded-xl bg-gray-900 text-sm font-semibold text-white disabled:bg-gray-200 disabled:text-gray-500"
              >
                Notu kaydet
              </button>
              {data.counts.late > 0 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void remind()}
                  className="min-h-[44px] rounded-xl border border-gray-300 bg-white text-sm font-semibold"
                >
                  Öğretmene hatırlat
                </button>
              )}
              <p className="text-xs leading-relaxed text-gray-600">Onay gerekmez. Not, öğretmenin Bu hafta ve Yıllık planım ekranlarında görünür.</p>
            </section>
          </div>
        </>
      )}
    </PageShell>
  )
}
