"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { CheckCircle2, ChevronLeft, FileDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { notify } from "@/lib/notify"
import { formatCommsDate, NOTICE_TYPE_LABEL } from "@/lib/comms/labels"
import { getAuthHeaders } from "./auth"
import { notifyCommsUnreadChanged } from "./unread-events"
import { commsApi, EmptyState, fullName, NOTICE_TYPE_BADGE, Pill, shortTime, Spinner } from "./shared"
import type { NoticeType, OfficialNotice } from "./types"

export async function downloadNoticePdf(id: string) {
  const res = await fetch(`/api/comms/notices/${id}/pdf`, { headers: getAuthHeaders() })
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error(j.error || "PDF indirilemedi")
  }
  const blob = await res.blob()
  const disposition = res.headers.get("content-disposition") || ""
  const star = /filename\*=UTF-8''([^;]+)/i.exec(disposition)
  const name = star ? decodeURIComponent(star[1]) : "ileti.pdf"
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Personelin gelen resmi iletileri (ihtar / talimat / idari duyuru) */
export function InboxPanel({ focusId, onChanged }: { focusId?: string | null; onChanged: () => void }) {
  const [notices, setNotices] = useState<OfficialNotice[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(focusId ?? null)
  const [typeFilter, setTypeFilter] = useState<"ALL" | NoticeType>("ALL")
  const [onlyUnseen, setOnlyUnseen] = useState(false)
  const [query, setQuery] = useState("")
  const [acking, setAcking] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  const load = useCallback(async () => {
    try {
      const j = await commsApi<{ notices: OfficialNotice[] }>("/api/comms/notices?box=inbox")
      setNotices(j.notices)
    } catch (e) {
      notify(e instanceof Error ? e.message : "İletiler yüklenemedi")
      setNotices([])
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR")
    return (notices ?? []).filter((n) => {
      if (typeFilter !== "ALL" && n.type !== typeFilter) return false
      if (onlyUnseen && n.seenAt) return false
      if (!q) return true
      return [n.subject, n.body, fullName(n.senderStaff), NOTICE_TYPE_LABEL[n.type]]
        .join(" ")
        .toLocaleLowerCase("tr-TR")
        .includes(q)
    })
  }, [notices, typeFilter, onlyUnseen, query])

  const unseenCount = (notices ?? []).filter((n) => !n.seenAt).length
  const current = (notices ?? []).find((n) => n.id === selectedId) || null

  const ack = async (id: string) => {
    setAcking(true)
    try {
      const j = await commsApi<{ notice: OfficialNotice }>(`/api/comms/notices/${id}/ack`, { method: "POST" })
      setNotices((prev) => (prev ?? []).map((n) => (n.id === id ? { ...n, seenAt: j.notice.seenAt } : n)))
      notifyCommsUnreadChanged()
      onChanged()
    } catch (e) {
      notify(e instanceof Error ? e.message : "İşlem başarısız")
    } finally {
      setAcking(false)
    }
  }

  if (!notices) return <Spinner />

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <aside
        className={`min-h-0 flex-col border-slate-200 md:flex md:w-[22rem] md:shrink-0 md:border-r ${
          current ? "hidden" : "flex flex-1"
        }`}
      >
        <div className="space-y-2 border-b bg-slate-50 p-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Gönderen veya konu ara…"
            className="h-9 bg-white text-sm"
          />
          <div className="flex flex-wrap gap-1.5">
            {(["ALL", "IHTAR", "TALIMAT", "PERSONEL_DUYURU"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  typeFilter === t ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                }`}
              >
                {t === "ALL" ? "Tümü" : NOTICE_TYPE_LABEL[t]}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setOnlyUnseen((v) => !v)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                onlyUnseen ? "bg-amber-500 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
              }`}
            >
              Görülmemiş ({unseenCount})
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <EmptyState
              title={notices.length === 0 ? "Gelen iletiniz yok" : "Filtreye uyan ileti yok"}
              hint={notices.length === 0 ? "Yönetimden gelen ihtar, talimat ve duyurular burada listelenir." : undefined}
            />
          ) : (
            <ul className="divide-y">
              {filtered.map((n) => {
                const unread = !n.seenAt
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(n.id)}
                      className={`w-full border-l-4 px-3 py-3 text-left transition ${
                        current?.id === n.id ? "bg-blue-50" : "hover:bg-slate-50"
                      } ${unread ? "border-l-amber-500" : "border-l-transparent"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Pill className={NOTICE_TYPE_BADGE[n.type]}>{NOTICE_TYPE_LABEL[n.type]}</Pill>
                        <span className="text-[11px] text-slate-400">{shortTime(n.createdAt)}</span>
                      </div>
                      <p className={`mt-1 truncate text-sm ${unread ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>
                        {n.subject}
                      </p>
                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <p className="truncate text-xs text-slate-500">{fullName(n.senderStaff)}</p>
                        {unread ? <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-label="Görülmedi" /> : null}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </aside>

      <main className={`min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 ${current ? "block" : "hidden md:block"}`}>
        {!current ? (
          <EmptyState title="Bir ileti seçin" hint="Okuduğunuz iletiyi “Görüldü” olarak işaretlemeyi unutmayın; bu resmi bir kayıttır." />
        ) : (
          <article className="mx-auto max-w-3xl space-y-5">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 md:hidden"
              onClick={() => setSelectedId(null)}
            >
              <ChevronLeft className="h-4 w-4" /> İletiler
            </button>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Pill className={NOTICE_TYPE_BADGE[current.type]}>{NOTICE_TYPE_LABEL[current.type]}</Pill>
                <h2 className="mt-2 text-2xl font-bold leading-snug text-slate-900">{current.subject}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {fullName(current.senderStaff)} · {formatCommsDate(current.createdAt)}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={pdfLoading}
                onClick={async () => {
                  setPdfLoading(true)
                  try {
                    await downloadNoticePdf(current.id)
                  } catch (e) {
                    notify(e instanceof Error ? e.message : "PDF indirilemedi")
                  } finally {
                    setPdfLoading(false)
                  }
                }}
              >
                {pdfLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                PDF
              </Button>
            </div>

            <div className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-5 text-base leading-7 text-slate-900">
              {current.body}
            </div>

            {current.seenAt ? (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <CheckCircle2 className="h-5 w-5" />
                {formatCommsDate(current.seenAt)} tarihinde görüldü olarak kaydedildi.
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm text-amber-900">
                  Bu ileti okunduğunu belgeleyen bir kayıt bekliyor. Okuduysanız onaylayın.
                </p>
                <Button onClick={() => void ack(current.id)} disabled={acking}>
                  {acking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Okudum, görüldü
                </Button>
              </div>
            )}
          </article>
        )}
      </main>
    </div>
  )
}
