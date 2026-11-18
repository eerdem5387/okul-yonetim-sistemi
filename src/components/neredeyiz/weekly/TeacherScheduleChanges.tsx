"use client"

import Link from "next/link"
import { ArrowRight, Loader2 } from "lucide-react"
import { postJson, useJson } from "./shared"

type Slot = { dayOfWeek: number; startTime: string; endTime: string }
type Change = {
  id: string
  kind: "ADDED" | "REMOVED" | "MOVED"
  className: string
  subjectName: string
  before: Slot | null
  after: Slot | null
  changedByName: string | null
  createdAt: string
  read: boolean
}

const DAYS = ["", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]
const slot = (s: Slot | null) => (s ? `${DAYS[s.dayOfWeek] ?? ""} ${s.startTime}–${s.endTime}` : "")

const KIND = {
  ADDED: { label: "SİZE EKLENDİ", tag: "bg-green-100 text-green-900", border: "border-green-200" },
  MOVED: { label: "SAATİ DEĞİŞTİ", tag: "bg-amber-100 text-amber-900", border: "border-amber-200" },
  REMOVED: { label: "SİZDEN ALINDI", tag: "bg-gray-100 text-gray-700", border: "border-gray-200" },
} as const

/** Öğretmen — ders programı değişiklikleri (önce / sonra). */
export function TeacherScheduleChanges({ onRead }: { onRead?: () => void }) {
  const { data, loading, error, reload } = useJson<{ unreadCount: number; changes: Change[] }>("/api/neredeyiz/me/schedule-changes")

  async function markRead() {
    await postJson("/api/neredeyiz/me/schedule-changes")
    await reload()
    onRead?.()
  }

  if (loading && !data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-700" />
      </div>
    )
  }
  if (error) return <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</p>
  if (!data) return null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[15px] text-gray-600">Son 60 gündeki değişiklikler. Program değiştiğinde size bildirim gelir.</p>
        <div className="flex gap-2">
          <Link href="/ogretmen/ders-programim" className="flex min-h-[44px] items-center rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-900">
            Programımı aç
          </Link>
          {data.unreadCount > 0 && (
            <button type="button" onClick={() => void markRead()} className="min-h-[44px] rounded-xl bg-indigo-700 px-4 text-sm font-semibold text-white">
              Anladım ({data.unreadCount})
            </button>
          )}
        </div>
      </div>

      {data.changes.length === 0 && (
        <p className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-600">Son 60 günde programınızda değişiklik olmadı.</p>
      )}

      {data.changes.map((c) => {
        const k = KIND[c.kind]
        return (
          <section key={c.id} className={`flex flex-col gap-2 rounded-2xl border bg-white p-4 ${k.border}`}>
            <div className="flex items-center justify-between gap-2">
              <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${k.tag}`}>{k.label}</span>
              <span className="text-xs text-gray-600">
                {new Date(c.createdAt).toLocaleDateString("tr-TR")}
                {!c.read ? " · yeni" : ""}
              </span>
            </div>
            <p className="text-[17px] font-bold">
              {c.className} · {c.subjectName}
            </p>
            {c.kind === "MOVED" ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-gray-500 line-through">{slot(c.before)}</span>
                <ArrowRight className="h-4 w-4 text-green-700" aria-hidden="true" />
                <span className="font-semibold text-green-900">{slot(c.after)}</span>
              </div>
            ) : (
              <p className={`text-sm ${c.kind === "REMOVED" ? "text-gray-500 line-through" : "text-gray-800"}`}>{slot(c.after ?? c.before)}</p>
            )}
            <p className="text-[13px] text-gray-600">
              {c.kind === "ADDED"
                ? "Konu takibi bu sınıfta kaldığı yerden sürer; Yıllık planım sekmesinde görebilirsiniz."
                : c.kind === "REMOVED"
                  ? "Bu sınıfın takibi derse giren öğretmene geçer; tamamladığınız konular adınızla kalır."
                  : "Haftalık ders saati değişmediyse konu planınız etkilenmez."}
              {c.changedByName ? ` · Değiştiren: ${c.changedByName}` : ""}
            </p>
          </section>
        )
      })}
    </div>
  )
}
