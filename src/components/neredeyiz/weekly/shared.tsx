"use client"

import { useCallback, useEffect, useState } from "react"

/** Haftalık Neredeyiz ekranlarının ortak parçaları (tasarım: "Haftalık Neredeyiz — Ekran Taslakları"). */

export type WeeklyState = "TAMAMLANDI" | "GEC_TAMAMLANDI" | "GECIKTI" | "BU_HAFTA" | "PLANLANDI" | "PLANSIZ"

export type TopicView = {
  id: string
  name: string
  unitName: string
  rangeLabel: string
  plannedEndLabel: string | null
  state: WeeklyState
  lateDays: number
  completedOn: string | null
  completedKey: string | null
  lateReason: string | null
  lateReasonLabel: string | null
  note: string | null
  guidanceNotes: Array<{ id: string; text: string; createdAt: string }>
}

export const LATE_REASON_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "IZIN", label: "İzin" },
  { value: "RAPOR", label: "Rapor" },
  { value: "ETKINLIK", label: "Etkinlik / gezi" },
  { value: "PROGRAM_DEGISIKLIGI", label: "Program değişikliği" },
  { value: "DIGER", label: "Diğer" },
]

const BADGE: Record<WeeklyState, { label: string; cls: string }> = {
  TAMAMLANDI: { label: "Tamamlandı", cls: "bg-green-100 text-green-900" },
  GEC_TAMAMLANDI: { label: "Geç tamamlandı", cls: "bg-amber-100 text-amber-900" },
  GECIKTI: { label: "Gecikti", cls: "bg-red-700 text-white" },
  BU_HAFTA: { label: "Bu hafta", cls: "bg-indigo-100 text-indigo-800" },
  PLANLANDI: { label: "Planlandı", cls: "bg-gray-100 text-gray-700" },
  PLANSIZ: { label: "Hafta girilmedi", cls: "bg-gray-100 text-gray-600" },
}

export function StateBadge({ state, extra }: { state: WeeklyState; extra?: string | null }) {
  const b = BADGE[state]
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ${b.cls}`}>
      {b.label}
      {extra ? ` · ${extra}` : ""}
    </span>
  )
}

/** JSON yükleyici: { data, error, loading, reload } */
export function useJson<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(!!url)

  const reload = useCallback(async () => {
    if (!url) return
    setLoading(true)
    try {
      const res = await fetch(url, { cache: "no-store" })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((body as { error?: string }).error || `Yüklenemedi (${res.status})`)
      setData(body as T)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi")
    } finally {
      setLoading(false)
    }
  }, [url])

  useEffect(() => {
    void reload()
  }, [reload])

  return { data, error, loading, reload, setData }
}

export async function postJson(url: string, body?: unknown, method = "POST") {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error((data as { error?: string }).error || "İşlem başarısız"), { data })
  return data
}

export function ReasonPicker({
  value,
  onChange,
}: {
  value: string | null
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Gecikme sebebi">
      {LATE_REASON_OPTIONS.map((o) => {
        const on = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`min-h-[44px] rounded-full px-4 text-sm ${
              on ? "border-2 border-gray-900 bg-gray-900 font-semibold text-white" : "border border-gray-300 bg-white text-gray-900"
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-[#F5F6F8]">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">{children}</div>
    </div>
  )
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className="text-[13px] font-semibold tracking-wide text-indigo-700">{children}</span>
}

export function StatCard({
  label,
  value,
  tone = "neutral",
  sub,
}: {
  label: string
  value: React.ReactNode
  tone?: "neutral" | "green" | "red" | "amber"
  sub?: string
}) {
  const cls =
    tone === "green"
      ? "bg-green-50 text-green-900 border-green-200"
      : tone === "red"
        ? "bg-red-50 text-red-900 border-red-200"
        : tone === "amber"
          ? "bg-amber-50 text-amber-900 border-amber-200"
          : "bg-white text-gray-900 border-gray-200"
  return (
    <div className={`flex flex-col gap-1 rounded-2xl border p-4 ${cls}`}>
      <span className="text-[13px] opacity-80">{label}</span>
      <span className="text-2xl font-bold">{value}</span>
      {sub && <span className="text-xs opacity-80">{sub}</span>}
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex overflow-hidden rounded-xl border border-gray-300 bg-white">
      {options.map((o, i) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-[44px] px-4 text-sm ${i > 0 ? "border-l border-gray-300" : ""} ${
            value === o.value ? "bg-gray-900 font-semibold text-white" : "bg-white text-gray-900"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
