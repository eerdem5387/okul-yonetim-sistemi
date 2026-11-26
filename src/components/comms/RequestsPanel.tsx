"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Check, Loader2, Plus, Trash2, Undo2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { notify } from "@/lib/notify"
import { formatCommsDate, REQUEST_STATUS_LABEL } from "@/lib/comms/labels"
import { notifyCommsUnreadChanged } from "./unread-events"
import {
  commsApi,
  ConfirmDialog,
  deptLabel,
  EmptyState,
  fullName,
  Pill,
  REQUEST_STATUS_BADGE,
  shortTime,
  Spinner,
} from "./shared"
import type { CommsTemplate, RequestStatus, StaffCommsRequest } from "./types"

type StatusFilter = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "ALL"

export function RequestsPanel({
  canApprove,
  canCreate,
  canDelete,
  focusId,
  onChanged,
}: {
  canApprove: boolean
  canCreate: boolean
  canDelete: boolean
  focusId?: string | null
  onChanged: () => void
}) {
  const [requests, setRequests] = useState<StaffCommsRequest[] | null>(null)
  const [status, setStatus] = useState<StatusFilter>(canApprove ? "PENDING" : "ALL")
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(focusId ?? null)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [bulk, setBulk] = useState<null | "approve" | "reject">(null)
  const [composeOpen, setComposeOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const j = await commsApi<{ requests: StaffCommsRequest[] }>(
        `/api/comms/requests?box=${canApprove ? "all" : "mine"}`
      )
      setRequests(j.requests)
      if (!canApprove) notifyCommsUnreadChanged()
    } catch (e) {
      notify(e instanceof Error ? e.message : "Talepler yüklenemedi")
      setRequests([])
    }
  }, [canApprove])

  useEffect(() => {
    void load()
  }, [load])

  const counts = useMemo(() => {
    const c: Record<string, number> = { PENDING: 0, APPROVED: 0, REJECTED: 0, CANCELLED: 0 }
    for (const r of requests ?? []) c[r.status] = (c[r.status] ?? 0) + 1
    return c
  }, [requests])

  const list = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR")
    return (requests ?? []).filter((r) => {
      if (status !== "ALL" && r.status !== status) return false
      if (!q) return true
      return [r.subject, r.body, fullName(r.requesterStaff), deptLabel(r.requesterStaff?.department)]
        .join(" ")
        .toLocaleLowerCase("tr-TR")
        .includes(q)
    })
  }, [requests, status, query])

  const pendingInView = list.filter((r) => r.status === "PENDING")
  const selected = (requests ?? []).find((r) => r.id === selectedId) || null

  const afterChange = async () => {
    setChecked(new Set())
    await load()
    notifyCommsUnreadChanged()
    onChanged()
  }

  const runBulk = async (note: string) => {
    if (!bulk) return
    try {
      const j = await commsApi<{ updated: number }>("/api/comms/requests/decide-bulk", {
        method: "POST",
        body: { ids: [...checked], decision: bulk, note },
      })
      notify(`${j.updated} talep ${bulk === "approve" ? "onaylandı" : "reddedildi"}`)
      setBulk(null)
      await afterChange()
    } catch (e) {
      notify(e instanceof Error ? e.message : "İşlem başarısız")
    }
  }

  const statusTabs: { key: StatusFilter; label: string }[] = canApprove
    ? [
        { key: "PENDING", label: `Bekleyen (${counts.PENDING})` },
        { key: "APPROVED", label: "Onaylanan" },
        { key: "REJECTED", label: "Reddedilen" },
        { key: "ALL", label: "Tümü" },
      ]
    : [
        { key: "ALL", label: "Tümü" },
        { key: "PENDING", label: `Bekleyen (${counts.PENDING})` },
        { key: "APPROVED", label: "Onaylanan" },
        { key: "REJECTED", label: "Reddedilen" },
        { key: "CANCELLED", label: "Geri çekilen" },
      ]

  if (!requests) return <Spinner />

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-3 border-b bg-slate-50 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5">
            {statusTabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setStatus(t.key)
                  setChecked(new Set())
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  status === t.key ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={canApprove ? "Talep eden, birim veya konu…" : "Konu ara…"}
              className="h-9 w-56 bg-white text-sm"
            />
            {canCreate ? (
              <Button size="sm" onClick={() => setComposeOpen(true)}>
                <Plus className="mr-1 h-4 w-4" /> Yeni talep
              </Button>
            ) : null}
          </div>
        </div>
        {canApprove && checked.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm">
            <span className="font-semibold text-blue-900">{checked.size} talep seçildi</span>
            <Button size="sm" onClick={() => setBulk("approve")}>
              <Check className="mr-1 h-4 w-4" /> Toplu onayla
            </Button>
            <Button size="sm" variant="outline" onClick={() => setBulk("reject")}>
              <X className="mr-1 h-4 w-4" /> Toplu reddet
            </Button>
            <button type="button" className="text-xs text-blue-700 underline" onClick={() => setChecked(new Set())}>
              Seçimi temizle
            </button>
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {list.length === 0 ? (
          <EmptyState
            title={canApprove && status === "PENDING" ? "Bekleyen talep yok 🎉" : "Talep yok"}
            hint={
              canCreate
                ? "İzin, malzeme, görev değişikliği gibi taleplerinizi buradan yönetime iletebilirsiniz."
                : undefined
            }
            action={canCreate ? <Button size="sm" onClick={() => setComposeOpen(true)}>Talep oluştur</Button> : undefined}
          />
        ) : (
          <ul className="divide-y">
            {canApprove && pendingInView.length > 1 ? (
              <li className="flex items-center gap-3 bg-white px-4 py-2 text-xs text-slate-500">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={pendingInView.every((r) => checked.has(r.id))}
                  onChange={(e) =>
                    setChecked(e.target.checked ? new Set(pendingInView.map((r) => r.id)) : new Set())
                  }
                />
                Bekleyenlerin tümünü seç
              </li>
            ) : null}
            {list.map((r) => (
              <li key={r.id} className={`flex items-start gap-3 px-4 py-3 ${r.newDecision ? "bg-blue-50/60" : "bg-white"}`}>
                {canApprove ? (
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    disabled={r.status !== "PENDING"}
                    checked={checked.has(r.id)}
                    onChange={(e) =>
                      setChecked((prev) => {
                        const next = new Set(prev)
                        if (e.target.checked) next.add(r.id)
                        else next.delete(r.id)
                        return next
                      })
                    }
                  />
                ) : null}
                <button type="button" onClick={() => setSelectedId(r.id)} className="min-w-0 flex-1 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900">{r.subject}</p>
                    <Pill className={REQUEST_STATUS_BADGE[r.status]}>{REQUEST_STATUS_LABEL[r.status]}</Pill>
                    {r.newDecision ? <Pill className="bg-blue-600 text-white ring-blue-600">Yeni karar</Pill> : null}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {canApprove
                      ? `${fullName(r.requesterStaff)} · ${deptLabel(r.requesterStaff?.department)} · `
                      : ""}
                    {shortTime(r.createdAt)}
                    {r.decidedByStaff && r.status !== "PENDING" ? ` · Karar: ${fullName(r.decidedByStaff)}` : ""}
                  </p>
                  <p className="mt-1 line-clamp-1 text-xs text-slate-600">{r.body}</p>
                </button>
                {canApprove && r.status === "PENDING" ? (
                  <QuickDecide id={r.id} onDone={afterChange} />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <RequestDetail
        request={selected}
        canApprove={canApprove}
        canDelete={canDelete}
        onClose={() => setSelectedId(null)}
        onChanged={afterChange}
      />
      <NewRequestDialog open={composeOpen} onClose={() => setComposeOpen(false)} onCreated={afterChange} />
      <ConfirmDialog
        open={bulk !== null}
        title={bulk === "approve" ? `${checked.size} talep onaylansın mı?` : `${checked.size} talep reddedilsin mi?`}
        description="Talep sahiplerine karar bildirimi gönderilir."
        confirmLabel={bulk === "approve" ? "Onayla" : "Reddet"}
        destructive={bulk === "reject"}
        noteLabel={bulk === "reject" ? "Red gerekçesi" : "Not (isteğe bağlı)"}
        noteRequired={bulk === "reject"}
        onCancel={() => setBulk(null)}
        onConfirm={runBulk}
      />
    </div>
  )
}

function QuickDecide({ id, onDone }: { id: string; onDone: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  return (
    <div className="flex shrink-0 gap-1">
      <button
        type="button"
        title="Hızlı onayla"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          try {
            await commsApi(`/api/comms/requests/${id}/decide`, { method: "POST", body: { decision: "approve" } })
            notify("Talep onaylandı")
            await onDone()
          } catch (e) {
            notify(e instanceof Error ? e.message : "İşlem başarısız")
          } finally {
            setBusy(false)
          }
        }}
        className="rounded-full bg-emerald-50 p-2 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      </button>
    </div>
  )
}

function Timeline({ r }: { r: StaffCommsRequest }) {
  const steps: { label: string; at?: string | null; done: boolean; tone?: string }[] = [
    { label: "Oluşturuldu", at: r.createdAt, done: true },
    { label: "Yönetim inceledi", at: r.viewedAt, done: Boolean(r.viewedAt) || r.status !== "PENDING" },
    {
      label:
        r.status === "PENDING"
          ? "Karar bekleniyor"
          : r.status === "CANCELLED"
            ? "Geri çekildi"
            : `${REQUEST_STATUS_LABEL[r.status]}${r.decidedByStaff ? ` · ${fullName(r.decidedByStaff)}` : ""}`,
      at: r.decidedAt,
      done: r.status !== "PENDING",
      tone: r.status === "APPROVED" ? "bg-emerald-600" : r.status === "REJECTED" ? "bg-red-600" : undefined,
    },
  ]
  return (
    <ol className="space-y-2">
      {steps.map((s) => (
        <li key={s.label} className="flex items-center gap-3 text-sm">
          <span className={`h-2.5 w-2.5 rounded-full ${s.done ? s.tone || "bg-blue-600" : "bg-slate-300"}`} />
          <span className={s.done ? "text-slate-900" : "text-slate-400"}>{s.label}</span>
          {s.at ? <span className="text-xs text-slate-400">{formatCommsDate(s.at)}</span> : null}
        </li>
      ))}
    </ol>
  )
}

function RequestDetail({
  request,
  canApprove,
  canDelete,
  onClose,
  onChanged,
}: {
  request: StaffCommsRequest | null
  canApprove: boolean
  canDelete: boolean
  onClose: () => void
  onChanged: () => Promise<void>
}) {
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState<null | "approve" | "reject" | "cancel" | "delete">(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    setNote("")
    if (request && canApprove && request.status === "PENDING" && !request.viewedAt) {
      void commsApi(`/api/comms/requests/${request.id}/view`, { method: "POST" }).catch(() => undefined)
    }
  }, [request, canApprove])

  if (!request) return null

  const decide = async (decision: "approve" | "reject") => {
    if (decision === "reject" && !note.trim()) {
      notify("Reddetmek için kısa bir gerekçe yazın")
      return
    }
    setBusy(decision)
    try {
      await commsApi(`/api/comms/requests/${request.id}/decide`, {
        method: "POST",
        body: { decision, note: note.trim() || undefined },
      })
      notify(decision === "approve" ? "Talep onaylandı" : "Talep reddedildi")
      onClose()
      await onChanged()
    } catch (e) {
      notify(e instanceof Error ? e.message : "İşlem başarısız")
    } finally {
      setBusy(null)
    }
  }

  const cancel = async () => {
    setBusy("cancel")
    try {
      await commsApi(`/api/comms/requests/${request.id}/cancel`, { method: "POST" })
      notify("Talep geri çekildi")
      onClose()
      await onChanged()
    } catch (e) {
      notify(e instanceof Error ? e.message : "İşlem başarısız")
    } finally {
      setBusy(null)
    }
  }

  const remove = async () => {
    try {
      await commsApi(`/api/comms/requests/${request.id}`, { method: "DELETE" })
      notify("Talep silindi")
      setConfirmDelete(false)
      onClose()
      await onChanged()
    } catch (e) {
      notify(e instanceof Error ? e.message : "Silinemedi")
    }
  }

  const note2 = request.decisionNote || request.rejectReason

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2 pr-8">
            <DialogTitle className="text-left">{request.subject}</DialogTitle>
            <Pill className={REQUEST_STATUS_BADGE[request.status]}>{REQUEST_STATUS_LABEL[request.status as RequestStatus]}</Pill>
          </div>
          <DialogDescription className="text-left">
            {fullName(request.requesterStaff)}
            {request.requesterStaff?.department ? ` · ${deptLabel(request.requesterStaff.department)}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-3 space-y-4">
          <div className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-900">
            {request.body}
          </div>
          <Timeline r={request} />
          {note2 ? (
            <div
              className={`rounded-lg px-3 py-2 text-sm ${
                request.status === "REJECTED" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"
              }`}
            >
              <span className="font-semibold">Yönetim notu:</span> {note2}
            </div>
          ) : null}

          {canApprove && request.status === "PENDING" ? (
            <div className="space-y-2 rounded-xl border border-slate-200 p-3">
              <label className="block text-sm font-medium text-slate-700">
                Karar notu <span className="font-normal text-slate-400">(redde zorunlu)</span>
              </label>
              <textarea
                className="min-h-[4.5rem] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                value={note}
                maxLength={1000}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Örn: Uygundur, ilgili birime iletildi."
              />
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" disabled={busy !== null} onClick={() => void decide("reject")}>
                  {busy === "reject" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-1 h-4 w-4" />}
                  Reddet
                </Button>
                <Button disabled={busy !== null} onClick={() => void decide("approve")}>
                  {busy === "approve" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
                  Onayla
                </Button>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap justify-between gap-2">
            {!canApprove && request.status === "PENDING" ? (
              <Button variant="outline" disabled={busy !== null} onClick={() => void cancel()}>
                <Undo2 className="mr-1 h-4 w-4" /> Talebi geri çek
              </Button>
            ) : (
              <span />
            )}
            {canDelete ? (
              <Button variant="ghost" className="text-red-700" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="mr-1 h-4 w-4" /> Sil
              </Button>
            ) : null}
          </div>
        </div>
        <ConfirmDialog
          open={confirmDelete}
          title="Talep kalıcı olarak silinsin mi?"
          description="Bu işlem geri alınamaz."
          confirmLabel="Sil"
          destructive
          onCancel={() => setConfirmDelete(false)}
          onConfirm={remove}
        />
      </DialogContent>
    </Dialog>
  )
}

function NewRequestDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => Promise<void>
}) {
  const [templates, setTemplates] = useState<CommsTemplate[]>([])
  const [templateId, setTemplateId] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    void commsApi<{ templates: CommsTemplate[] }>("/api/comms/templates?kind=PERSONEL_TALEP")
      .then((j) => setTemplates(j.templates))
      .catch(() => setTemplates([]))
  }, [open])

  const submit = async () => {
    setBusy(true)
    try {
      await commsApi("/api/comms/requests", {
        method: "POST",
        body: { templateId: templateId || undefined, subject, body },
      })
      notify("Talebiniz yönetime iletildi")
      setTemplateId("")
      setSubject("")
      setBody("")
      onClose()
      await onCreated()
    } catch (e) {
      notify(e instanceof Error ? e.message : "Gönderilemedi")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-left">Yeni talep</DialogTitle>
          <DialogDescription className="text-left">
            Talebiniz Kurucu ve Müdür’e bildirim olarak gider; karar verildiğinde size haber verilir.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-3 space-y-3">
          {templates.length ? (
            <div className="flex flex-wrap gap-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTemplateId(t.id)
                    setSubject(t.title)
                    setBody(t.body)
                  }}
                  className={`rounded-full px-3 py-1.5 text-sm ${
                    templateId === t.id ? "bg-blue-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {t.title}
                </button>
              ))}
            </div>
          ) : null}
          <Input value={subject} maxLength={200} onChange={(e) => setSubject(e.target.value)} placeholder="Konu" />
          <textarea
            className="min-h-[9rem] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            value={body}
            maxLength={10000}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Talebinizi açıklayın…"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Vazgeç
            </Button>
            <Button onClick={() => void submit()} disabled={busy || !subject.trim() || !body.trim()}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Talebi gönder
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
