"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { FileDown, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getAuthHeaders } from "./auth"
import { ComposeNoticeWizard } from "./ComposeNoticeWizard"
import { PlaceholderInsertBar } from "./PlaceholderInsert"
import { notifyCommsUnreadChanged } from "./unread-events"
import { RECIPIENT_NAME_TOKEN } from "@/lib/comms/placeholders"
import {
  formatCommsDate,
  NOTICE_TYPE_LABEL,
  NOTICE_TYPE_TEXT_CLASS,
  REQUEST_STATUS_LABEL,
  TEMPLATE_KIND_LABEL,
} from "@/lib/comms/labels"
import type {
  ClassGroupSummary,
  CommsMe,
  CommsTemplate,
  OfficialNotice,
  StaffCommsRequest,
} from "./types"

type NoticeType = "IHTAR" | "TALIMAT" | "PERSONEL_DUYURU"
type Tab =
  | "inbox"
  | "ihtar"
  | "talimat"
  | "duyuru"
  | "requests"
  | "sent"
  | "groups"
  | "templates"
  | "class-announcements"

const COMPOSE_TABS: Record<"ihtar" | "talimat" | "duyuru", NoticeType> = {
  ihtar: "IHTAR",
  talimat: "TALIMAT",
  duyuru: "PERSONEL_DUYURU",
}

export function CommsLayout({ kind }: { kind: "staff" | "parent" }) {
  const [me, setMe] = useState<CommsMe | null>(null)
  const [tab, setTab] = useState<Tab>(kind === "parent" ? "groups" : "inbox")
  const [loading, setLoading] = useState(true)
  const [inboxNotices, setInboxNotices] = useState<OfficialNotice[]>([])
  const [sentNotices, setSentNotices] = useState<OfficialNotice[]>([])
  const [requests, setRequests] = useState<StaffCommsRequest[]>([])
  const [groups, setGroups] = useState<ClassGroupSummary[]>([])
  const [templates, setTemplates] = useState<CommsTemplate[]>([])
  const [selectedNotice, setSelectedNotice] = useState<OfficialNotice | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)

  const loadMe = useCallback(async () => {
    const res = await fetch("/api/comms/me", { headers: getAuthHeaders(), cache: "no-store" })
    const json = await res.json()
    if (res.ok) setMe(json)
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      await loadMe()
      if (kind === "staff") {
        const [inbox, sent, req, grp, tpl] = await Promise.all([
          fetch("/api/comms/notices?box=inbox", { headers: getAuthHeaders(), cache: "no-store" }).then((r) => r.json()),
          fetch("/api/comms/notices?box=sent", { headers: getAuthHeaders(), cache: "no-store" }).then((r) => r.json()),
          fetch("/api/comms/requests?box=all", { headers: getAuthHeaders(), cache: "no-store" }).then((r) => r.json()),
          fetch("/api/comms/class-groups", { headers: getAuthHeaders(), cache: "no-store" }).then((r) => r.json()),
          fetch("/api/comms/templates?active=0", { headers: getAuthHeaders(), cache: "no-store" }).then((r) => r.json()),
        ])
        setInboxNotices(inbox.notices || [])
        setSentNotices(sent.notices || [])
        setRequests(req.requests || [])
        setGroups(grp.groups || [])
        setTemplates(tpl.templates || [])
      } else {
        const [grp, ann] = await Promise.all([
          fetch("/api/comms/class-groups", { headers: getAuthHeaders(), cache: "no-store" }).then((r) => r.json()),
          fetch("/api/comms/class-announcements", { headers: getAuthHeaders(), cache: "no-store" }).then((r) => r.json()),
        ])
        setGroups(grp.groups || [])
        setInboxNotices(
          (ann.announcements || []).map((a: OfficialNotice & { seenAt?: string | null }) => ({
            id: a.id,
            type: "PERSONEL_DUYURU" as const,
            subject: (a as { subject: string }).subject,
            body: (a as { body: string }).body,
            createdAt: (a as { createdAt: string }).createdAt,
            seenAt: a.seenAt ?? null,
            senderStaff: (a as { senderStaff?: OfficialNotice["senderStaff"] }).senderStaff,
          }))
        )
      }
    } finally {
      setLoading(false)
      notifyCommsUnreadChanged()
    }
  }, [kind, loadMe])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const caps = me?.capabilities

  // Yetkiye göre varsayılan / yasaklı sekmeyi düzelt
  useEffect(() => {
    if (kind !== "staff" || !caps) return
    if (caps.sendOfficial && tab === "inbox") setTab("ihtar")
    if (!caps.sendOfficial && (tab === "ihtar" || tab === "talimat" || tab === "duyuru" || tab === "sent")) {
      setTab("inbox")
    }
  }, [caps, kind, tab])

  const tabs = useMemo(() => {
    if (kind === "parent") {
      return [
        { key: "groups" as const, label: "Sınıf Grupları" },
        {
          key: "class-announcements" as const,
          label: `Sınıf Duyuruları${me?.badges.unreadAnnouncements ? ` (${me.badges.unreadAnnouncements})` : ""}`,
        },
      ]
    }
    const list: { key: Tab; label: string }[] = []
    // İhtar / Talimat / Duyuru yalnızca resmi gönderim yetkilisinde (Kurucu/Müdür/grant)
    if (caps?.sendOfficial) {
      list.push(
        { key: "ihtar", label: "İhtar" },
        { key: "talimat", label: "Talimat" },
        { key: "duyuru", label: "İdari Duyuru" },
        { key: "sent", label: "Gönderilen İletiler" }
      )
    } else {
      // Personel / rehberlik / öğretmen: yalnızca gelen resmi iletiler
      list.push({
        key: "inbox",
        label: `Gelen${me?.badges.unreadNotices ? ` (${me.badges.unreadNotices})` : ""}`,
      })
    }
    list.push({
      key: "requests",
      label: caps?.approveRequests
        ? `Gelen Talepler${me?.badges.pendingRequests ? ` (${me.badges.pendingRequests})` : ""}`
        : `Talepler${me?.badges.pendingRequests ? ` (${me.badges.pendingRequests})` : ""}`,
    })
    if (caps?.sendClassAnnouncement) list.push({ key: "class-announcements", label: "Sınıf Duyuruları" })
    list.push({ key: "groups", label: "Sınıf Grupları" })
    if (caps?.manageTemplates) list.push({ key: "templates", label: "Şablonlar" })
    return list
  }, [kind, caps, me])

  const composeType = tab in COMPOSE_TABS ? COMPOSE_TABS[tab as keyof typeof COMPOSE_TABS] : null

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-white">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-4 sm:px-5">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">İç Haberleşme Sistemi</h1>
          <p className="text-sm text-gray-500">
            {kind === "staff" ? "Resmi personel iletişimi ve sınıf grupları" : "Sınıf grupları ve duyurular"}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => void refresh()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </header>

      <div className="border-b bg-slate-50/80 px-3 py-3 sm:px-4">
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setTab(t.key)
                setSelectedNotice(null)
              }}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition sm:text-base ${
                tab === t.key
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : composeType && kind === "staff" && caps?.sendOfficial ? (
          <ComposeNoticeWizard
            key={composeType}
            type={composeType}
            onDone={() => {
              setTab("sent")
              void refresh()
            }}
          />
        ) : tab === "inbox" && kind === "staff" ? (
          <NoticesPanel
            notices={inboxNotices}
            selected={selectedNotice}
            onSelect={setSelectedNotice}
            mode="inbox"
            onAcked={() => void refresh()}
          />
        ) : tab === "templates" ? (
          <TemplatesAdmin templates={templates} onChanged={() => void refresh()} />
        ) : tab === "requests" ? (
          <RequestsPanel
            requests={requests}
            canApprove={Boolean(caps?.approveRequests)}
            canCreate={Boolean(caps?.createRequest)}
            onChanged={() => void refresh()}
          />
        ) : tab === "groups" ? (
          <GroupsPanel
            groups={groups}
            kind={kind}
            actorId={me?.actor.id || ""}
            canCreate={Boolean(caps?.createClassGroup)}
            selectedId={selectedGroupId}
            onSelect={setSelectedGroupId}
            onChanged={() => void refresh()}
          />
        ) : tab === "class-announcements" ? (
          kind === "parent" ? (
            <ParentAnnouncements notices={inboxNotices} onAcked={() => void refresh()} />
          ) : (
            <ComposeClassAnnouncement groups={groups} onDone={() => void refresh()} />
          )
        ) : tab === "sent" && caps?.sendOfficial ? (
          <NoticesPanel
            notices={sentNotices}
            selected={selectedNotice}
            onSelect={setSelectedNotice}
            mode="sent"
            onAcked={() => void refresh()}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center p-6 text-sm text-gray-500">
            Bu alan için yetkiniz yok.
          </div>
        )}
      </div>
    </div>
  )
}

function NoticesPanel({
  notices,
  selected,
  onSelect,
  mode,
  onAcked,
}: {
  notices: OfficialNotice[]
  selected: OfficialNotice | null
  onSelect: (n: OfficialNotice | null) => void
  mode: "inbox" | "sent"
  onAcked: () => void
}) {
  const [acking, setAcking] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [typeFilter, setTypeFilter] = useState<"ALL" | NoticeType>("ALL")
  const [seenFilter, setSeenFilter] = useState<"ALL" | "SEEN" | "UNSEEN">("ALL")
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR")
    return notices.filter((n) => {
      if (typeFilter !== "ALL" && n.type !== typeFilter) return false
      if (seenFilter === "SEEN" && !n.seenAt) return false
      if (seenFilter === "UNSEEN" && n.seenAt) return false
      if (!q) return true
      const hay = [
        n.subject,
        n.body,
        n.senderStaff?.firstName,
        n.senderStaff?.lastName,
        n.recipientStaff?.firstName,
        n.recipientStaff?.lastName,
        NOTICE_TYPE_LABEL[n.type],
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr-TR")
      return hay.includes(q)
    })
  }, [notices, typeFilter, seenFilter, query])

  // Her zaman listeden güncel kaydı al (ack sonrası stale selected.seenAt olmasın)
  const current =
    (selected ? filtered.find((n) => n.id === selected.id) : null) ||
    (selected ? notices.find((n) => n.id === selected.id) : null) ||
    filtered[0] ||
    null

  const ack = async (id: string) => {
    if (acking) return
    setAcking(true)
    try {
      const res = await fetch(`/api/comms/notices/${id}/ack`, { method: "POST", headers: getAuthHeaders() })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(j.error || "İşlem başarısız")
        return
      }
      if (j.notice) onSelect(j.notice as OfficialNotice)
      notifyCommsUnreadChanged()
      onAcked()
    } finally {
      setAcking(false)
    }
  }

  const downloadPdf = async (id: string, subject: string) => {
    if (pdfLoading) return
    setPdfLoading(true)
    try {
      const res = await fetch(`/api/comms/notices/${id}/pdf`, { headers: getAuthHeaders() })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        alert(j.error || "PDF indirilemedi")
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${NOTICE_TYPE_LABEL[(notices.find((n) => n.id === id)?.type || "IHTAR") as NoticeType]}-${subject.slice(0, 40)}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      alert("PDF indirilemedi")
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <>
      <aside className="flex w-full max-w-sm flex-col border-r">
        <div className="space-y-2 border-b bg-slate-50 p-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={mode === "sent" ? "Alıcı veya konu ara…" : "Gönderen veya konu ara…"}
            className="h-9 bg-white text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as "ALL" | NoticeType)}
              className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800"
              aria-label="Tür filtresi"
            >
              <option value="ALL">Tüm türler</option>
              <option value="IHTAR">İhtar</option>
              <option value="TALIMAT">Talimat</option>
              <option value="PERSONEL_DUYURU">İdari Duyuru</option>
            </select>
            <select
              value={seenFilter}
              onChange={(e) => setSeenFilter(e.target.value as "ALL" | "SEEN" | "UNSEEN")}
              className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800"
              aria-label="Görülme filtresi"
            >
              <option value="ALL">Tümü</option>
              <option value="SEEN">Görüldü</option>
              <option value="UNSEEN">Bekliyor</option>
            </select>
          </div>
          <p className="text-xs text-slate-500">
            {filtered.length} / {notices.length} kayıt
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">
              {notices.length === 0 ? "Kayıt yok." : "Filtreye uyan kayıt yok."}
            </p>
          ) : (
            <ul className="divide-y">
              {filtered.map((n) => {
                const unread = mode === "inbox" && !n.seenAt
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(n)}
                      className={`w-full border-l-4 px-3 py-3 text-left transition ${
                        current?.id === n.id ? "bg-blue-50" : "hover:bg-slate-50"
                      } ${unread ? "border-l-amber-500 bg-amber-50/40" : "border-l-transparent"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-semibold uppercase ${NOTICE_TYPE_TEXT_CLASS[n.type]}`}>
                          {NOTICE_TYPE_LABEL[n.type]}
                        </span>
                        <span className="text-[11px] text-gray-400">{formatCommsDate(n.createdAt)}</span>
                      </div>
                      <p
                        className={`mt-0.5 truncate text-sm ${
                          unread ? "font-bold text-gray-900" : "font-medium text-gray-700"
                        }`}
                      >
                        {n.subject}
                      </p>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="truncate text-xs text-gray-500">
                          {mode === "sent"
                            ? `${n.recipientStaff?.firstName} ${n.recipientStaff?.lastName}`
                            : `${n.senderStaff?.firstName} ${n.senderStaff?.lastName}`}
                        </p>
                        {mode === "inbox" ? (
                          unread ? (
                            <span className="shrink-0 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                              Yeni
                            </span>
                          ) : (
                            <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                              Görüldü
                            </span>
                          )
                        ) : n.seenAt ? (
                          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                            Görüldü
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                            Bekliyor
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">
        {!current ? (
          <p className="text-base text-gray-500">Bir kayıt seçin.</p>
        ) : (
          <article className="mx-auto max-w-3xl space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={`text-sm font-bold uppercase tracking-wide ${NOTICE_TYPE_TEXT_CLASS[current.type]}`}
                  >
                    {NOTICE_TYPE_LABEL[current.type]}
                  </p>
                  {current.seenAt ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                      Görüldü
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-bold text-white">
                      {mode === "inbox" ? "Görülmedi" : "Bekliyor"}
                    </span>
                  )}
                </div>
                <h2 className="mt-2 text-2xl font-bold leading-snug text-gray-900">{current.subject}</h2>
              </div>
              <Button
                variant="outline"
                onClick={() => void downloadPdf(current.id, current.subject)}
                disabled={pdfLoading}
              >
                {pdfLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="mr-2 h-4 w-4" />
                )}
                PDF İndir
              </Button>
            </div>

            <dl className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {mode === "inbox" ? "Gönderen" : "Alıcı"}
                </dt>
                <dd className="mt-1 text-base font-semibold text-gray-900">
                  {mode === "inbox"
                    ? `${current.senderStaff?.firstName || ""} ${current.senderStaff?.lastName || ""}`.trim() ||
                      "—"
                    : `${current.recipientStaff?.firstName || ""} ${current.recipientStaff?.lastName || ""}`.trim() ||
                      "—"}
                </dd>
              </div>
              {mode === "sent" ? (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Gönderen</dt>
                  <dd className="mt-1 text-base font-semibold text-gray-900">
                    {`${current.senderStaff?.firstName || ""} ${current.senderStaff?.lastName || ""}`.trim() ||
                      "—"}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Oluşturulma</dt>
                <dd className="mt-1 text-base font-medium text-gray-800">{formatCommsDate(current.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Görüldü kaydı</dt>
                <dd
                  className={`mt-1 text-base font-medium ${
                    current.seenAt ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {current.seenAt ? formatCommsDate(current.seenAt) : "Henüz görülmedi"}
                </dd>
              </div>
            </dl>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">İleti metni</p>
              <div className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-5 text-base leading-7 text-gray-900">
                {current.body}
              </div>
            </div>

            {mode === "inbox" && !current.seenAt ? (
              <Button onClick={() => void ack(current.id)} disabled={acking}>
                {acking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Görüldü
              </Button>
            ) : null}
          </article>
        )}
      </main>
    </>
  )
}

function TemplatesAdmin({
  templates,
  onChanged,
}: {
  templates: CommsTemplate[]
  onChanged: () => void
}) {
  const [kind, setKind] = useState("IHTAR")
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const [grants, setGrants] = useState<
    { id: string; firstName: string; lastName: string; department: string; sendOfficial: boolean }[]
  >([])
  const [grantQ, setGrantQ] = useState("")

  useEffect(() => {
    void fetch("/api/comms/grants", { headers: getAuthHeaders(), cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setGrants(j.staff || []))
      .catch(() => setGrants([]))
  }, [])

  const resetForm = () => {
    setEditingId(null)
    setKind("IHTAR")
    setTitle("")
    setBody("")
  }

  const startEdit = (t: CommsTemplate) => {
    setEditingId(t.id)
    setKind(t.kind)
    setTitle(t.title)
    setBody(t.body)
  }

  const save = async () => {
    if (!title.trim() || !body.trim()) {
      alert("Başlık ve şablon metni zorunlu")
      return
    }
    setBusy(true)
    try {
      const res = await fetch(editingId ? `/api/comms/templates/${editingId}` : "/api/comms/templates", {
        method: editingId ? "PATCH" : "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(editingId ? { title, body } : { kind, title, body }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(j.error || "Kaydedilemedi")
        return
      }
      resetForm()
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  const toggleGrant = async (staffId: string, granted: boolean) => {
    const res = await fetch("/api/comms/grants", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ staffId, granted }),
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert(j.error || "Güncellenemedi")
      return
    }
    setGrants((prev) => prev.map((s) => (s.id === staffId ? { ...s, sendOfficial: granted } : s)))
  }

  const filteredGrants = grants.filter((s) => {
    const hay = `${s.firstName} ${s.lastName} ${s.department}`.toLocaleLowerCase("tr-TR")
    return hay.includes(grantQ.trim().toLocaleLowerCase("tr-TR"))
  })

  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      <div className="grid gap-3 rounded-xl border p-4 md:grid-cols-2">
        <select
          className="rounded-md border px-3 py-2 text-sm disabled:bg-slate-100"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          disabled={Boolean(editingId)}
        >
          {Object.entries(TEMPLATE_KIND_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <Input placeholder="Başlık" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="md:col-span-2 space-y-2">
          <PlaceholderInsertBar textareaRef={bodyRef} value={body} onChange={setBody} />
          <textarea
            ref={bodyRef}
            className="min-h-[10rem] w-full rounded-md border px-3 py-2 text-sm"
            placeholder={`Örn: Sayın ${RECIPIENT_NAME_TOKEN},\n\nAşağıdaki duyuruyu bilgilerinize sunarız:\n\n[Duyuru metni]\n\nSaygılarımızla.`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2 md:col-span-2">
          <Button onClick={() => void save()} disabled={busy}>
            {editingId ? "Şablonu güncelle" : "Şablon ekle"}
          </Button>
          {editingId ? (
            <Button type="button" variant="outline" onClick={resetForm} disabled={busy}>
              Vazgeç
            </Button>
          ) : null}
        </div>
      </div>
      <ul className="divide-y rounded-xl border">
        {templates.map((t) => (
          <li key={t.id} className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-blue-700">{TEMPLATE_KIND_LABEL[t.kind as keyof typeof TEMPLATE_KIND_LABEL]}</p>
              <p className="font-medium">{t.title}</p>
              <p className="line-clamp-3 whitespace-pre-wrap text-xs text-gray-500">{t.body}</p>
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <Button size="sm" variant="outline" onClick={() => startEdit(t)}>
                Düzenle
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  void fetch(`/api/comms/templates/${t.id}`, {
                    method: "PATCH",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ isActive: !t.isActive }),
                  }).then(onChanged)
                }
              >
                {t.isActive ? "Pasifleştir" : "Aktifleştir"}
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <div className="space-y-2 rounded-xl border p-4">
        <p className="text-sm font-semibold">Resmi gönderim yetkisi (send_official)</p>
        <p className="text-xs text-gray-500">
          Kurucu ve Müdür native yetkilidir. Diğer personele buradan messaging.create grant verilir.
        </p>
        <Input value={grantQ} onChange={(e) => setGrantQ(e.target.value)} placeholder="Personel ara…" />
        <ul className="max-h-64 divide-y overflow-y-auto rounded-md border">
          {filteredGrants.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <span>
                {s.firstName} {s.lastName}
                <span className="ml-2 text-xs text-gray-400">{s.department}</span>
              </span>
              <Button
                size="sm"
                variant={s.sendOfficial ? "default" : "outline"}
                onClick={() => void toggleGrant(s.id, !s.sendOfficial)}
              >
                {s.sendOfficial ? "Yetkili" : "Ver"}
              </Button>
            </li>
          ))}
          {filteredGrants.length === 0 ? (
            <li className="p-3 text-xs text-gray-500">Kayıt yok.</li>
          ) : null}
        </ul>
      </div>
    </div>
  )
}

function requestStatusTone(status: StaffCommsRequest["status"]) {
  if (status === "APPROVED") {
    return {
      row: "border-l-emerald-600 bg-emerald-50/50 hover:bg-emerald-50",
      badge: "bg-emerald-600 text-white",
    }
  }
  if (status === "REJECTED") {
    return {
      row: "border-l-red-600 bg-red-50/50 hover:bg-red-50",
      badge: "bg-red-600 text-white",
    }
  }
  return {
    row: "border-l-amber-500 bg-amber-50/50 hover:bg-amber-50",
    badge: "bg-amber-500 text-white",
  }
}

function RequestsPanel({
  requests,
  canApprove,
  canCreate,
  onChanged,
}: {
  requests: StaffCommsRequest[]
  canApprove: boolean
  canCreate: boolean
  onChanged: () => void
}) {
  const [templates, setTemplates] = useState<CommsTemplate[]>([])
  const [templateId, setTemplateId] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [customizing, setCustomizing] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deciding, setDeciding] = useState(false)

  useEffect(() => {
    if (!canCreate) return
    void fetch("/api/comms/templates?kind=PERSONEL_TALEP", { headers: getAuthHeaders(), cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setTemplates(j.templates || []))
  }, [canCreate])

  const tpl = templates.find((t) => t.id === templateId)
  useEffect(() => {
    if (!tpl || customizing) return
    setSubject(tpl.title)
    setBody(tpl.body)
  }, [tpl, customizing])

  const create = async () => {
    const res = await fetch("/api/comms/requests", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ templateId, subject, body }),
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert(j.error || "Gönderilemedi")
      return
    }
    setTemplateId("")
    setSubject("")
    setBody("")
    setCustomizing(false)
    onChanged()
  }

  const decide = async (id: string, decision: "approve" | "reject") => {
    if (deciding) return
    let rejectReason: string | undefined
    if (decision === "reject") {
      rejectReason = window.prompt("Red gerekçesi (opsiyonel)") || undefined
    }
    setDeciding(true)
    try {
      const res = await fetch(`/api/comms/requests/${id}/decide`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ decision, rejectReason }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(j.error || "İşlem başarısız")
        return
      }
      setSelectedId(null)
      onChanged()
    } finally {
      setDeciding(false)
    }
  }

  const pending = requests.filter((r) => r.status === "PENDING")
  const decided = requests.filter((r) => r.status !== "PENDING")
  const list = canApprove ? [...pending, ...decided] : requests
  const selected = selectedId ? requests.find((r) => r.id === selectedId) || null : null
  const selectedRequester = selected
    ? `${selected.requesterStaff?.firstName || ""} ${selected.requesterStaff?.lastName || ""}`.trim() || "—"
    : ""

  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      {canApprove ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-900">Gelen talepler — onay kuyruğu</p>
          <p className="mt-0.5 text-xs text-amber-800">
            Satıra tıklayarak detayı açın. Onay / red işlemleri detay penceresinden yapılır.
          </p>
          <p className="mt-2 text-sm font-medium text-amber-950">Bekleyen: {pending.length}</p>
        </div>
      ) : null}

      {canCreate ? (
        <div className="space-y-3 rounded-xl border p-4">
          <p className="text-sm font-semibold">Yeni talep</p>
          <select
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={templateId}
            onChange={(e) => {
              setTemplateId(e.target.value)
              setCustomizing(false)
            }}
          >
            <option value="">Şablon seçin</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={!customizing && !templateId}
            placeholder="Konu"
          />
          <textarea
            className="min-h-[8rem] w-full rounded-md border px-3 py-2 text-sm"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={!customizing && !templateId}
          />
          {templateId && !customizing ? (
            <Button variant="outline" size="sm" onClick={() => setCustomizing(true)}>
              Bu talep için şablonu özelleştir
            </Button>
          ) : null}
          <Button size="sm" onClick={() => void create()} disabled={!templateId}>
            Talebi gönder
          </Button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {list.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">
            {canApprove ? "Talep yok." : "Talep yok."}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {list.map((r) => {
              const requester =
                `${r.requesterStaff?.firstName || ""} ${r.requesterStaff?.lastName || ""}`.trim() || "—"
              const tone = requestStatusTone(r.status)
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(r.id)}
                    className={`flex w-full items-center gap-3 border-l-4 px-3 py-2.5 text-left transition ${tone.row}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {r.subject}
                        <span className="font-semibold text-slate-700"> — {requester}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">{formatCommsDate(r.createdAt)}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${tone.badge}`}
                    >
                      {REQUEST_STATUS_LABEL[r.status]}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-xl">
          {selected ? (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2 pr-8">
                  <DialogTitle className="text-left">{selected.subject}</DialogTitle>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      requestStatusTone(selected.status).badge
                    }`}
                  >
                    {REQUEST_STATUS_LABEL[selected.status]}
                  </span>
                </div>
                <DialogDescription className="text-left text-sm text-slate-600">
                  Talep eden: <span className="font-semibold text-slate-900">{selectedRequester}</span>
                  {" · "}
                  {formatCommsDate(selected.createdAt)}
                </DialogDescription>
              </DialogHeader>
              <div className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-900">
                {selected.body}
              </div>
              {selected.rejectReason ? (
                <p className="text-sm font-medium text-red-700">Gerekçe: {selected.rejectReason}</p>
              ) : null}
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setSelectedId(null)} disabled={deciding}>
                  Kapat
                </Button>
                {canApprove && selected.status === "PENDING" ? (
                  <>
                    <Button
                      variant="outline"
                      disabled={deciding}
                      onClick={() => void decide(selected.id, "reject")}
                    >
                      Reddet
                    </Button>
                    <Button disabled={deciding} onClick={() => void decide(selected.id, "approve")}>
                      {deciding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Onayla
                    </Button>
                  </>
                ) : null}
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function GroupsPanel({
  groups,
  kind,
  actorId,
  canCreate,
  selectedId,
  onSelect,
  onChanged,
}: {
  groups: ClassGroupSummary[]
  kind: "staff" | "parent"
  actorId: string
  canCreate: boolean
  selectedId: string | null
  onSelect: (id: string | null) => void
  onChanged: () => void
}) {
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([])
  const [classId, setClassId] = useState("")
  const [title, setTitle] = useState("")
  const [counselorStaffId, setCounselorStaffId] = useState("")
  const [guides, setGuides] = useState<{ id: string; firstName: string; lastName: string; department: string }[]>([])
  const [messages, setMessages] = useState<
    {
      id: string
      body: string
      createdAt: string
      sender: { kind: "staff" | "parent"; id: string; displayName: string } | null
    }[]
  >([])
  const [detail, setDetail] = useState<{ parentsCanPost: boolean; counselorStaffId?: string | null } | null>(null)
  const [text, setText] = useState("")
  const [teachers, setTeachers] = useState<{ id: string; firstName: string; lastName: string }[]>([])
  const [addTeacherId, setAddTeacherId] = useState("")

  useEffect(() => {
    if (kind !== "staff") return
    void Promise.all([
      canCreate
        ? fetch("/api/comms/classes", { headers: getAuthHeaders(), cache: "no-store" }).then((r) => r.json())
        : Promise.resolve({ classes: [] }),
      fetch("/api/comms/staff", { headers: getAuthHeaders(), cache: "no-store" }).then((r) => r.json()),
    ]).then(([c, s]) => {
      setClasses(c.classes || [])
      setGuides(
        (s.staff || []).filter(
          (x: { department: string }) => x.department === "REHBERLIK" || x.department === "BAS_REHBERLIK"
        )
      )
      setTeachers(s.staff || [])
    })
  }, [canCreate, kind])

  useEffect(() => {
    if (!selectedId) {
      setMessages([])
      setDetail(null)
      return
    }
    void Promise.all([
      fetch(`/api/comms/class-groups/${selectedId}/messages`, { headers: getAuthHeaders(), cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/comms/class-groups/${selectedId}`, { headers: getAuthHeaders(), cache: "no-store" }).then((r) => r.json()),
    ]).then(([m, d]) => {
      setMessages(m.messages || [])
      setDetail(d.group || null)
    })
  }, [selectedId])

  const create = async () => {
    const res = await fetch("/api/comms/class-groups", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ classId, title, counselorStaffId: counselorStaffId || undefined }),
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert(j.error || "Oluşturulamadı")
      return
    }
    setClassId("")
    setTitle("")
    setCounselorStaffId("")
    onChanged()
    onSelect(j.group.id)
  }

  const send = async () => {
    if (!selectedId || !text.trim()) return
    const res = await fetch(`/api/comms/class-groups/${selectedId}/messages`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ body: text }),
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert(j.error || "Gönderilemedi")
      return
    }
    setText("")
    const m = await fetch(`/api/comms/class-groups/${selectedId}/messages`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    }).then((r) => r.json())
    setMessages(m.messages || [])
  }

  const toggleParents = async () => {
    if (!selectedId || !detail) return
    const res = await fetch(`/api/comms/class-groups/${selectedId}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ parentsCanPost: !detail.parentsCanPost }),
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert(j.error || "Güncellenemedi")
      return
    }
    setDetail((d) => (d ? { ...d, parentsCanPost: !d.parentsCanPost } : d))
    onChanged()
  }

  const addTeacher = async () => {
    if (!selectedId || !addTeacherId) return
    const res = await fetch(`/api/comms/class-groups/${selectedId}/members`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ staffIds: [addTeacherId] }),
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert(j.error || "Eklenemedi")
      return
    }
    setAddTeacherId("")
    onChanged()
  }

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="w-full max-w-xs overflow-y-auto border-r">
        {canCreate ? (
          <div className="space-y-2 border-b p-3">
            <select className="w-full rounded-md border px-2 py-1.5 text-sm" value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">Sınıf seçin</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Input placeholder="Grup adı" value={title} onChange={(e) => setTitle(e.target.value)} />
            <select
              className="w-full rounded-md border px-2 py-1.5 text-sm"
              value={counselorStaffId}
              onChange={(e) => setCounselorStaffId(e.target.value)}
            >
              <option value="">Rehberlik (opsiyonel)</option>
              {guides.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.firstName} {g.lastName}
                </option>
              ))}
            </select>
            <Button size="sm" onClick={() => void create()} disabled={!classId || !title.trim()}>
              Grup oluştur
            </Button>
          </div>
        ) : null}
        <ul className="divide-y">
          {groups.map((g) => (
            <li key={g.id}>
              <button
                type="button"
                className={`w-full px-3 py-3 text-left hover:bg-slate-50 ${selectedId === g.id ? "bg-blue-50" : ""}`}
                onClick={() => onSelect(g.id)}
              >
                <p className="text-sm font-medium">{g.title}</p>
                <p className="text-xs text-gray-500">{g.class.name}</p>
              </button>
            </li>
          ))}
          {groups.length === 0 ? <li className="p-4 text-sm text-gray-500">Grup yok.</li> : null}
        </ul>
      </aside>
      <main className="flex flex-1 flex-col">
        {!selectedId ? (
          <p className="p-4 text-sm text-gray-500">Bir grup seçin.</p>
        ) : (
          <>
            {kind === "staff" && detail ? (
              <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
                <Button size="sm" variant="outline" onClick={() => void toggleParents()}>
                  Veli yazma: {detail.parentsCanPost ? "Açık" : "Kapalı"}
                </Button>
                <select
                  className="rounded-md border px-2 py-1 text-sm"
                  value={addTeacherId}
                  onChange={(e) => setAddTeacherId(e.target.value)}
                >
                  <option value="">Öğretmen ekle</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.firstName} {t.lastName}
                    </option>
                  ))}
                </select>
                <Button size="sm" variant="outline" onClick={() => void addTeacher()} disabled={!addTeacherId}>
                  Ekle
                </Button>
              </div>
            ) : null}
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto bg-[#eef2f7] p-4">
              {messages.map((m) => {
                const mine =
                  Boolean(actorId) &&
                  m.sender?.id === actorId &&
                  m.sender?.kind === kind
                return (
                  <div
                    key={m.id}
                    className={`flex w-full ${mine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[78%] rounded-2xl px-3.5 py-2 shadow-sm ${
                        mine
                          ? "rounded-br-md bg-blue-600 text-white"
                          : "rounded-bl-md border border-slate-200 bg-white text-slate-900"
                      }`}
                    >
                      {!mine ? (
                        <p className="mb-0.5 text-[11px] font-semibold text-slate-500">
                          {m.sender?.displayName || "Sistem"}
                        </p>
                      ) : null}
                      <p className={`text-sm whitespace-pre-wrap leading-relaxed ${mine ? "text-white" : "text-slate-800"}`}>
                        {m.body}
                      </p>
                      <p
                        className={`mt-1 text-right text-[10px] ${
                          mine ? "text-blue-100" : "text-slate-400"
                        }`}
                      >
                        {formatCommsDate(m.createdAt)}
                      </p>
                    </div>
                  </div>
                )
              })}
              {messages.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">Henüz mesaj yok.</p>
              ) : null}
            </div>
            <div className="flex gap-2 border-t bg-white p-3">
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Mesaj yazın…"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    void send()
                  }
                }}
              />
              <Button onClick={() => void send()} disabled={!text.trim()}>
                Gönder
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function ComposeClassAnnouncement({
  groups,
  onDone,
}: {
  groups: ClassGroupSummary[]
  onDone: () => void
}) {
  const [templates, setTemplates] = useState<CommsTemplate[]>([])
  const [classGroupId, setClassGroupId] = useState("")
  const [templateId, setTemplateId] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [customizing, setCustomizing] = useState(false)

  useEffect(() => {
    void fetch("/api/comms/templates?kind=SINIF_DUYURU", { headers: getAuthHeaders(), cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setTemplates(j.templates || []))
  }, [])

  const tpl = templates.find((t) => t.id === templateId)
  useEffect(() => {
    if (!tpl || customizing) return
    setSubject(tpl.title)
    setBody(tpl.body)
  }, [tpl, customizing])

  const send = async () => {
    const res = await fetch("/api/comms/class-announcements", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ classGroupId, templateId, subject, body }),
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert(j.error || "Gönderilemedi")
      return
    }
    alert(`${j.recipientCount} veliye duyuru iletildi`)
    onDone()
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-3 overflow-y-auto p-4">
      <select className="w-full rounded-md border px-3 py-2 text-sm" value={classGroupId} onChange={(e) => setClassGroupId(e.target.value)}>
        <option value="">Sınıf grubu seçin</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.title} · {g.class.name}
          </option>
        ))}
      </select>
      <select
        className="w-full rounded-md border px-3 py-2 text-sm"
        value={templateId}
        onChange={(e) => {
          setTemplateId(e.target.value)
          setCustomizing(false)
        }}
      >
        <option value="">Şablon seçin</option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.title}
          </option>
        ))}
      </select>
      <Input value={subject} onChange={(e) => setSubject(e.target.value)} disabled={!customizing} />
      <textarea
        className="min-h-[10rem] w-full rounded-md border px-3 py-2 text-sm"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        disabled={!customizing}
      />
      {templateId && !customizing ? (
        <Button variant="outline" onClick={() => setCustomizing(true)}>
          Bu sınıf duyurusu için şablonu özelleştir
        </Button>
      ) : null}
      <Button onClick={() => void send()} disabled={!classGroupId || !templateId}>
        Sınıf duyurusunu gönder
      </Button>
    </div>
  )
}

function ParentAnnouncements({
  notices,
  onAcked,
}: {
  notices: OfficialNotice[]
  onAcked: () => void
}) {
  const [ackingId, setAckingId] = useState<string | null>(null)

  const ack = async (id: string) => {
    if (ackingId) return
    setAckingId(id)
    try {
      const res = await fetch(`/api/comms/class-announcements/${id}/ack`, {
        method: "POST",
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        alert(j.error || "İşlem başarısız")
        return
      }
      notifyCommsUnreadChanged()
      onAcked()
    } finally {
      setAckingId(null)
    }
  }

  return (
    <div className="flex-1 space-y-3 overflow-y-auto p-4">
      {notices.map((n) => (
        <article
          key={n.id}
          className={`rounded-xl border p-4 ${
            n.seenAt ? "border-slate-200 bg-white" : "border-amber-300 bg-amber-50/50"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className={`font-semibold ${n.seenAt ? "text-gray-800" : "text-gray-900"}`}>{n.subject}</h3>
            {n.seenAt ? (
              <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                Görüldü
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                Yeni
              </span>
            )}
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-gray-800">{n.body}</p>
          <p className="mt-3 border-t pt-2 text-xs text-slate-600">
            Oluşturulma tarihi: {formatCommsDate(n.createdAt)}
          </p>
          {!n.seenAt ? (
            <Button
              className="mt-2"
              size="sm"
              disabled={ackingId === n.id}
              onClick={() => void ack(n.id)}
            >
              {ackingId === n.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Görüldü
            </Button>
          ) : (
            <p className="mt-2 text-sm font-medium text-emerald-700">
              Görüldü kaydı: {formatCommsDate(n.seenAt)}
            </p>
          )}
        </article>
      ))}
      {notices.length === 0 ? <p className="text-sm text-gray-500">Duyuru yok.</p> : null}
    </div>
  )
}
