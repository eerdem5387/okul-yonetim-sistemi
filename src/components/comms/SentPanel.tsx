"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { BellRing, ChevronLeft, FileDown, Loader2, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { notify } from "@/lib/notify"
import { formatCommsDate, NOTICE_TYPE_LABEL } from "@/lib/comms/labels"
import { downloadNoticePdf } from "./InboxPanel"
import {
  commsApi,
  ConfirmDialog,
  deptLabel,
  EmptyState,
  fullName,
  NOTICE_TYPE_BADGE,
  Pill,
  ReadProgress,
  shortTime,
  Spinner,
} from "./shared"
import type { BatchRecipient, NoticeBatch, NoticeType } from "./types"

type BatchDetail = {
  batch: Omit<NoticeBatch, "singleRecipient" | "unseen" | "lastRemindedAt" | "mine">
  recipients: BatchRecipient[]
}

/** Gönderilen iletiler: gönderim bazında görme takibi, hatırlatma, geri çekme */
export function SentPanel({
  canViewAll,
  focusBatchId,
  onCompose,
}: {
  canViewAll: boolean
  focusBatchId?: string | null
  onCompose: () => void
}) {
  const [scope, setScope] = useState<"mine" | "all">(canViewAll ? "all" : "mine")
  const [typeFilter, setTypeFilter] = useState<"ALL" | NoticeType>("ALL")
  const [query, setQuery] = useState("")
  const [batches, setBatches] = useState<NoticeBatch[] | null>(null)
  const [selected, setSelected] = useState<string | null>(focusBatchId ?? null)
  const [detail, setDetail] = useState<BatchDetail | null>(null)
  const [recipientFilter, setRecipientFilter] = useState<"ALL" | "UNSEEN" | "SEEN">("ALL")
  const [reminding, setReminding] = useState(false)
  const [confirmWithdraw, setConfirmWithdraw] = useState(false)
  const [pdfId, setPdfId] = useState<string | null>(null)

  const loadList = useCallback(async () => {
    try {
      const params = new URLSearchParams({ scope })
      if (typeFilter !== "ALL") params.set("type", typeFilter)
      const j = await commsApi<{ batches: NoticeBatch[] }>(`/api/comms/notices/batches?${params}`)
      setBatches(j.batches)
    } catch (e) {
      notify(e instanceof Error ? e.message : "Gönderimler yüklenemedi")
      setBatches([])
    }
  }, [scope, typeFilter])

  const loadDetail = useCallback(async (batchId: string) => {
    try {
      setDetail(await commsApi<BatchDetail>(`/api/comms/notices/batches/${batchId}`))
    } catch (e) {
      notify(e instanceof Error ? e.message : "Gönderim yüklenemedi")
      setDetail(null)
    }
  }, [])

  useEffect(() => {
    void loadList()
  }, [loadList])

  useEffect(() => {
    setDetail(null)
    setRecipientFilter("ALL")
    if (selected) void loadDetail(selected)
  }, [selected, loadDetail])

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR")
    if (!q) return batches ?? []
    return (batches ?? []).filter((b) =>
      [b.subject, fullName(b.sender), fullName(b.singleRecipient)].join(" ").toLocaleLowerCase("tr-TR").includes(q)
    )
  }, [batches, query])

  const recipients = useMemo(() => {
    const list = detail?.recipients ?? []
    if (recipientFilter === "UNSEEN") return list.filter((r) => !r.seenAt)
    if (recipientFilter === "SEEN") return list.filter((r) => r.seenAt)
    return list
  }, [detail, recipientFilter])

  const remind = async (noticeIds?: string[]) => {
    if (!selected) return
    setReminding(true)
    try {
      const j = await commsApi<{ reminded: number; skipped: number }>(
        `/api/comms/notices/batches/${selected}/remind`,
        { method: "POST", body: noticeIds ? { noticeIds } : {} }
      )
      notify(
        `${j.reminded} kişiye hatırlatma gönderildi${j.skipped ? ` (${j.skipped} kişiye kısa süre önce gönderilmişti)` : ""}`
      )
      await loadDetail(selected)
    } catch (e) {
      notify(e instanceof Error ? e.message : "Hatırlatma gönderilemedi")
    } finally {
      setReminding(false)
    }
  }

  const withdraw = async () => {
    if (!selected) return
    try {
      const j = await commsApi<{ count: number }>(`/api/comms/notices/batches/${selected}`, { method: "DELETE" })
      notify(`Gönderim geri çekildi (${j.count} kayıt)`)
      setConfirmWithdraw(false)
      setSelected(null)
      await loadList()
    } catch (e) {
      notify(e instanceof Error ? e.message : "Geri çekilemedi")
    }
  }

  const current = detail?.batch
  const selectedSummary = (batches ?? []).find((b) => b.batchId === selected)

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <aside
        className={`min-h-0 flex-col border-slate-200 md:flex md:w-[24rem] md:shrink-0 md:border-r ${
          selected ? "hidden" : "flex flex-1"
        }`}
      >
        <div className="space-y-2 border-b bg-slate-50 p-3">
          {canViewAll ? (
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-200/70 p-1 text-xs font-semibold">
              {(["all", "mine"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScope(s)}
                  className={`rounded-md py-1.5 ${scope === s ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
                >
                  {s === "all" ? "Tüm gönderimler" : "Benim gönderdiklerim"}
                </button>
              ))}
            </div>
          ) : null}
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Konu, gönderen veya alıcı ara…"
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
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {!batches ? (
            <Spinner />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="Gönderim yok"
              hint="Gönderdiğiniz ihtar, talimat ve duyurular alıcıların görme durumuyla burada izlenir."
              action={<Button size="sm" onClick={onCompose}>Yeni ileti oluştur</Button>}
            />
          ) : (
            <ul className="divide-y">
              {filtered.map((b) => (
                <li key={b.batchId}>
                  <button
                    type="button"
                    onClick={() => setSelected(b.batchId)}
                    className={`w-full px-3 py-3 text-left transition ${
                      selected === b.batchId ? "bg-blue-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Pill className={NOTICE_TYPE_BADGE[b.type]}>{NOTICE_TYPE_LABEL[b.type]}</Pill>
                      <span className="text-[11px] text-slate-400">{shortTime(b.createdAt)}</span>
                    </div>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-900">{b.subject}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {b.singleRecipient ? fullName(b.singleRecipient) : `${b.total} alıcı`}
                      {scope === "all" ? ` · Gönderen: ${fullName(b.sender)}` : ""}
                    </p>
                    <div className="mt-2">
                      <ReadProgress seen={b.seen} total={b.total} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <main className={`min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 ${selected ? "block" : "hidden md:block"}`}>
        {!selected ? (
          <EmptyState title="Bir gönderim seçin" hint="Kimlerin gördüğünü izleyin, görmeyenlere tek tıkla hatırlatma gönderin." />
        ) : !current ? (
          <Spinner />
        ) : (
          <article className="mx-auto max-w-3xl space-y-5">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 md:hidden"
              onClick={() => setSelected(null)}
            >
              <ChevronLeft className="h-4 w-4" /> Gönderimler
            </button>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Pill className={NOTICE_TYPE_BADGE[current.type]}>{NOTICE_TYPE_LABEL[current.type]}</Pill>
                <h2 className="mt-2 text-2xl font-bold leading-snug text-slate-900">{current.subject}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {fullName(current.sender)} · {formatCommsDate(current.createdAt)}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-red-700"
                onClick={() => setConfirmWithdraw(true)}
              >
                <Undo2 className="mr-2 h-4 w-4" />
                Geri çek
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Alıcı" value={current.total} />
              <Stat label="Gördü" value={current.seen} tone="text-emerald-700" />
              <Stat label="Bekliyor" value={current.total - current.seen} tone="text-amber-700" />
            </div>
            <ReadProgress seen={current.seen} total={current.total} />

            <details className="rounded-xl border border-slate-200 bg-slate-50">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700">İleti metni</summary>
              <div className="whitespace-pre-wrap border-t border-slate-200 px-4 py-3 text-sm leading-6 text-slate-800">
                {current.body}
              </div>
            </details>

            <section className="rounded-xl border border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
                <div className="flex gap-1.5">
                  {(["ALL", "UNSEEN", "SEEN"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setRecipientFilter(f)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        recipientFilter === f ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {f === "ALL" ? "Tümü" : f === "UNSEEN" ? "Görmeyenler" : "Görenler"}
                    </button>
                  ))}
                </div>
                {current.total - current.seen > 0 ? (
                  <Button size="sm" disabled={reminding} onClick={() => void remind()}>
                    {reminding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BellRing className="mr-2 h-4 w-4" />}
                    Görmeyenlere hatırlat ({current.total - current.seen})
                  </Button>
                ) : (
                  <span className="text-xs font-semibold text-emerald-700">Herkes gördü ✓</span>
                )}
              </div>
              <ul className="divide-y">
                {recipients.map((r) => (
                  <li key={r.noticeId} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{fullName(r.staff)}</p>
                      <p className="text-xs text-slate-500">
                        {deptLabel(r.staff.department)}
                        {r.remindCount ? ` · ${r.remindCount} kez hatırlatıldı` : ""}
                      </p>
                    </div>
                    {r.seenAt ? (
                      <Pill className="bg-emerald-50 text-emerald-800 ring-emerald-200">Gördü · {shortTime(r.seenAt)}</Pill>
                    ) : (
                      <>
                        <Pill className="bg-amber-50 text-amber-800 ring-amber-200">Bekliyor</Pill>
                        <button
                          type="button"
                          title="Bu kişiye hatırlat"
                          disabled={reminding}
                          onClick={() => void remind([r.noticeId])}
                          className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-700"
                        >
                          <BellRing className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      title="PDF indir"
                      disabled={pdfId === r.noticeId}
                      onClick={async () => {
                        setPdfId(r.noticeId)
                        try {
                          await downloadNoticePdf(r.noticeId)
                        } catch (e) {
                          notify(e instanceof Error ? e.message : "PDF indirilemedi")
                        } finally {
                          setPdfId(null)
                        }
                      }}
                      className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    >
                      {pdfId === r.noticeId ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                    </button>
                  </li>
                ))}
                {recipients.length === 0 ? <li className="px-4 py-6 text-center text-sm text-slate-500">Kayıt yok.</li> : null}
              </ul>
            </section>
          </article>
        )}
      </main>

      <ConfirmDialog
        open={confirmWithdraw}
        title="Gönderim geri çekilsin mi?"
        description={`“${selectedSummary?.subject ?? current?.subject ?? ""}” ${current?.total ?? ""} alıcının gelen kutusundan kaldırılır. Kayıt, denetim için sistemde saklanmaya devam eder.`}
        confirmLabel="Geri çek"
        destructive
        onCancel={() => setConfirmWithdraw(false)}
        onConfirm={withdraw}
      />
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${tone || "text-slate-900"}`}>{value}</p>
    </div>
  )
}
