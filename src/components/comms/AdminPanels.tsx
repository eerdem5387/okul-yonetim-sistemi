"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Loader2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { notify } from "@/lib/notify"
import { TEMPLATE_KIND_LABEL } from "@/lib/comms/labels"
import { RECIPIENT_NAME_TOKEN } from "@/lib/comms/placeholders"
import { PlaceholderInsertBar } from "./PlaceholderInsert"
import { commsApi, deptLabel, EmptyState, fullName, Spinner } from "./shared"
import type { CommsTemplate } from "./types"

const KIND_ORDER = ["IHTAR", "TALIMAT", "PERSONEL_DUYURU", "SINIF_DUYURU", "PERSONEL_TALEP"] as const

/** Şablon yönetimi (Kurucu / Müdür / Sistem yöneticisi) */
export function TemplatesAdmin() {
  const [templates, setTemplates] = useState<CommsTemplate[] | null>(null)
  const [kindFilter, setKindFilter] = useState<string>("ALL")
  const [kind, setKind] = useState<string>("IHTAR")
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const load = useCallback(async () => {
    try {
      const j = await commsApi<{ templates: CommsTemplate[] }>("/api/comms/templates?active=0")
      setTemplates(j.templates)
    } catch (e) {
      notify(e instanceof Error ? e.message : "Şablonlar yüklenemedi")
      setTemplates([])
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const reset = () => {
    setEditingId(null)
    setTitle("")
    setBody("")
    setFormOpen(false)
  }

  const save = async () => {
    setBusy(true)
    try {
      await commsApi(editingId ? `/api/comms/templates/${editingId}` : "/api/comms/templates", {
        method: editingId ? "PATCH" : "POST",
        body: editingId ? { title, body } : { kind, title, body },
      })
      notify(editingId ? "Şablon güncellendi" : "Şablon eklendi")
      reset()
      await load()
    } catch (e) {
      notify(e instanceof Error ? e.message : "Kaydedilemedi")
    } finally {
      setBusy(false)
    }
  }

  const toggleActive = async (t: CommsTemplate) => {
    try {
      await commsApi(`/api/comms/templates/${t.id}`, { method: "PATCH", body: { isActive: !t.isActive } })
      await load()
    } catch (e) {
      notify(e instanceof Error ? e.message : "Güncellenemedi")
    }
  }

  const list = (templates ?? []).filter((t) => kindFilter === "ALL" || t.kind === kindFilter)

  if (!templates) return <Spinner />

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        {(["ALL", ...KIND_ORDER] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKindFilter(k)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              kindFilter === k ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
            }`}
          >
            {k === "ALL" ? "Tümü" : TEMPLATE_KIND_LABEL[k]}
          </button>
        ))}
        <Button
          size="sm"
          className="ml-auto"
          onClick={() => {
            reset()
            setKind(kindFilter === "ALL" ? "IHTAR" : kindFilter)
            setFormOpen(true)
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Yeni şablon
        </Button>
      </div>

      {formOpen ? (
        <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/40 p-4">
          <div className="grid gap-3 md:grid-cols-[14rem_1fr]">
            <select
              className="h-10 rounded-lg border border-slate-200 px-3 text-sm disabled:bg-slate-100"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              disabled={Boolean(editingId)}
            >
              {KIND_ORDER.map((k) => (
                <option key={k} value={k}>
                  {TEMPLATE_KIND_LABEL[k]}
                </option>
              ))}
            </select>
            <Input placeholder="Şablon başlığı (iletinin konusu olur)" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          {kind !== "PERSONEL_TALEP" && kind !== "SINIF_DUYURU" ? (
            <PlaceholderInsertBar textareaRef={bodyRef} value={body} onChange={setBody} />
          ) : null}
          <textarea
            ref={bodyRef}
            className="min-h-[10rem] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder={`Örn: Sayın ${RECIPIENT_NAME_TOKEN},\n\n…`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="flex gap-2">
            <Button onClick={() => void save()} disabled={busy || !title.trim() || !body.trim()}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingId ? "Güncelle" : "Ekle"}
            </Button>
            <Button variant="outline" onClick={reset} disabled={busy}>
              Vazgeç
            </Button>
          </div>
        </div>
      ) : null}

      {list.length === 0 ? (
        <EmptyState title="Şablon yok" hint="Sık gönderilen ileti ve talepler için şablon ekleyerek zaman kazanın." />
      ) : (
        <ul className="divide-y rounded-xl border border-slate-200 bg-white">
          {list.map((t) => (
            <li key={t.id} className={`flex items-start justify-between gap-3 px-4 py-3 ${t.isActive ? "" : "opacity-60"}`}>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-blue-700">
                  {TEMPLATE_KIND_LABEL[t.kind as keyof typeof TEMPLATE_KIND_LABEL]}
                  {t.isActive ? "" : " · Pasif"}
                </p>
                <p className="font-medium text-slate-900">{t.title}</p>
                <p className="line-clamp-2 whitespace-pre-wrap text-xs text-slate-500">{t.body}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingId(t.id)
                    setKind(t.kind)
                    setTitle(t.title)
                    setBody(t.body)
                    setFormOpen(true)
                  }}
                >
                  Düzenle
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void toggleActive(t)}>
                  {t.isActive ? "Pasifleştir" : "Aktifleştir"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

type GrantRow = { id: string; firstName: string; lastName: string; department: string; sendOfficial: boolean }

/** Resmi gönderim yetkisi (Kurucu / Sistem yöneticisi) */
export function GrantsAdmin() {
  const [rows, setRows] = useState<GrantRow[] | null>(null)
  const [q, setQ] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    void commsApi<{ staff: GrantRow[] }>("/api/comms/grants")
      .then((j) => setRows(j.staff))
      .catch((e) => {
        notify(e instanceof Error ? e.message : "Liste yüklenemedi")
        setRows([])
      })
  }, [])

  const filtered = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("tr-TR")
    const list = (rows ?? []).filter((s) =>
      `${s.firstName} ${s.lastName} ${deptLabel(s.department)}`.toLocaleLowerCase("tr-TR").includes(needle)
    )
    return list.sort((a, b) => Number(b.sendOfficial) - Number(a.sendOfficial))
  }, [rows, q])

  const toggle = async (s: GrantRow) => {
    setBusyId(s.id)
    try {
      await commsApi("/api/comms/grants", { method: "POST", body: { staffId: s.id, granted: !s.sendOfficial } })
      setRows((prev) => (prev ?? []).map((r) => (r.id === s.id ? { ...r, sendOfficial: !s.sendOfficial } : r)))
      notify(!s.sendOfficial ? `${fullName(s)} artık resmi ileti gönderebilir` : "Yetki kaldırıldı")
    } catch (e) {
      notify(e instanceof Error ? e.message : "Güncellenemedi")
    } finally {
      setBusyId(null)
    }
  }

  if (!rows) return <Spinner />

  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        Kurucu ve Müdür her zaman resmi ileti gönderebilir. Buradan yetki verilen personel (ör. müdür yardımcısı)
        ihtar, talimat ve idari duyuru gönderebilir; yetkililer ileti alıcısı olmaz.
      </div>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Personel veya birim ara…" />
      <ul className="divide-y rounded-xl border border-slate-200 bg-white">
        {filtered.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
            <span>
              <span className="font-medium text-slate-900">{fullName(s)}</span>
              <span className="ml-2 text-xs text-slate-500">{deptLabel(s.department)}</span>
            </span>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
              {busyId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {s.sendOfficial ? "Yetkili" : "Yetkisiz"}
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={s.sendOfficial}
                disabled={busyId === s.id}
                onChange={() => void toggle(s)}
              />
            </label>
          </li>
        ))}
        {filtered.length === 0 ? <li className="px-4 py-4 text-sm text-slate-500">Kayıt yok.</li> : null}
      </ul>
    </div>
  )
}
