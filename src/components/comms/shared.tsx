"use client"

import { useState, type ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { STAFF_DEPARTMENT_LABELS } from "@/lib/hr/constants"
import { getAuthHeaders } from "./auth"

/** JSON API çağrısı: hata durumunda sunucunun Türkçe mesajıyla Error fırlatır. */
export async function commsApi<T = unknown>(
  url: string,
  init?: { method?: string; body?: unknown }
): Promise<T> {
  const res = await fetch(url, {
    method: init?.method ?? "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  })
  const json = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) throw new Error(json.error || "İşlem tamamlanamadı")
  return json as T
}

export function deptLabel(dept?: string | null): string {
  if (!dept) return ""
  return STAFF_DEPARTMENT_LABELS[dept as keyof typeof STAFF_DEPARTMENT_LABELS] || dept
}

export function fullName(s?: { firstName?: string; lastName?: string } | null): string {
  return `${s?.firstName || ""} ${s?.lastName || ""}`.trim() || "—"
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** Liste zamanı: bugün → saat, dün → "Dün", bu yıl → gün ay, eski → tarih */
export function shortTime(value: string | Date): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (sameDay(d, now)) return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
  if (sameDay(d, yesterday)) return "Dün"
  if (d.getFullYear() === now.getFullYear()) return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })
  return d.toLocaleDateString("tr-TR")
}

export function clockTime(value: string | Date): string {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
}

/** Sohbet gün ayracı etiketi */
export function dayLabel(value: string | Date): string {
  const d = new Date(value)
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (sameDay(d, now)) return "Bugün"
  if (sameDay(d, yesterday)) return "Dün"
  return d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: d.getFullYear() === now.getFullYear() ? undefined : "numeric",
    weekday: "long",
  })
}

export function dayKey(value: string | Date) {
  const d = new Date(value)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export function CountBadge({ count, tone = "red" }: { count?: number; tone?: "red" | "amber" | "blue" }) {
  if (!count) return null
  const cls =
    tone === "amber" ? "bg-amber-500" : tone === "blue" ? "bg-blue-600" : "bg-red-500"
  return (
    <span
      className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white ${cls}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  )
}

export function ReadProgress({ seen, total }: { seen: number; total: number }) {
  const pct = total ? Math.round((seen / total) * 100) : 0
  const tone = pct === 100 ? "bg-emerald-500" : pct >= 50 ? "bg-blue-500" : "bg-amber-500"
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="shrink-0 text-xs font-medium tabular-nums text-slate-600">
        {seen}/{total}
      </span>
    </div>
  )
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {hint ? <p className="max-w-sm text-sm text-slate-500">{hint}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}

export function Spinner() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
    </div>
  )
}

/** window.confirm yerine uygulama içi onay penceresi (isteğe bağlı not alanıyla) */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive,
  noteLabel,
  notePlaceholder,
  noteRequired,
  onCancel,
  onConfirm,
}: {
  open: boolean
  title: string
  description?: string
  confirmLabel: string
  destructive?: boolean
  noteLabel?: string
  notePlaceholder?: string
  noteRequired?: boolean
  onCancel: () => void
  onConfirm: (note: string) => Promise<void> | void
}) {
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const close = () => {
    if (busy) return
    setNote("")
    onCancel()
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="pr-8 text-left">{title}</DialogTitle>
          {description ? <DialogDescription className="text-left">{description}</DialogDescription> : null}
        </DialogHeader>
        {noteLabel ? (
          <label className="mt-2 block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">{noteLabel}</span>
            <textarea
              className="min-h-[5.5rem] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              value={note}
              placeholder={notePlaceholder}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
            />
          </label>
        ) : null}
        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={close} disabled={busy}>
            Vazgeç
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={busy || (noteRequired && !note.trim())}
            onClick={async () => {
              setBusy(true)
              try {
                await onConfirm(note.trim())
                setNote("")
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const NOTICE_TYPE_BADGE: Record<string, string> = {
  IHTAR: "bg-red-100 text-red-800 ring-red-200",
  TALIMAT: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  PERSONEL_DUYURU: "bg-blue-100 text-blue-800 ring-blue-200",
}

export const REQUEST_STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-900 ring-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  REJECTED: "bg-red-100 text-red-800 ring-red-200",
  CANCELLED: "bg-slate-100 text-slate-600 ring-slate-200",
}

export function Pill({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${className || ""}`}>
      {children}
    </span>
  )
}
