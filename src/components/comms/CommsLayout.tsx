"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Plus, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { COMMS_UNREAD_EVENT, notifyCommsUnreadChanged } from "./unread-events"
import { commsApi, ConfirmDialog, CountBadge, Spinner } from "./shared"
import { OverviewPanel } from "./OverviewPanel"
import { InboxPanel } from "./InboxPanel"
import { SentPanel } from "./SentPanel"
import { ComposeNotice, emptyDraft, isDraftDirty, type ComposeDraft } from "./ComposeNotice"
import { RequestsPanel } from "./RequestsPanel"
import { GroupsPanel } from "./GroupsPanel"
import { GrantsAdmin, TemplatesAdmin } from "./AdminPanels"
import type { CommsMe, NoticeType } from "./types"

type Tab = "overview" | "inbox" | "sent" | "compose" | "requests" | "groups" | "templates" | "grants"

const VALID_TABS: Tab[] = ["overview", "inbox", "sent", "compose", "requests", "groups", "templates", "grants"]

export function CommsLayout({ kind }: { kind: "staff" | "parent" }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [me, setMe] = useState<CommsMe | null>(null)
  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get("tab") as Tab | null
    if (kind === "parent") return "groups"
    return t && VALID_TABS.includes(t) ? t : "overview"
  })
  const [focusId, setFocusId] = useState<string | null>(searchParams.get("id"))
  const [panelKey, setPanelKey] = useState(0)
  const [draft, setDraftState] = useState<ComposeDraft>(() => emptyDraft())
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const loadMe = useCallback(async () => {
    try {
      setMe(await commsApi<CommsMe>("/api/comms/me"))
    } catch {
      // oturum düştüyse sayfa koruması yönlendirir
    }
  }, [])

  useEffect(() => {
    void loadMe()
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void loadMe()
    }, 30_000)
    const onChange = () => void loadMe()
    window.addEventListener(COMMS_UNREAD_EVENT, onChange)
    window.addEventListener("focus", onChange)
    return () => {
      clearInterval(t)
      window.removeEventListener(COMMS_UNREAD_EVENT, onChange)
      window.removeEventListener("focus", onChange)
    }
  }, [loadMe])

  const caps = me?.capabilities
  const badges = me?.badges

  // URL'yi sekmeyle eşle (bildirim ve zil bağlantıları doğrudan açabilsin)
  const go = useCallback(
    (next: Tab, id?: string | null) => {
      setTab(next)
      setFocusId(id ?? null)
      setPanelKey((k) => k + 1)
      const params = new URLSearchParams()
      if (next !== "overview" && kind === "staff") params.set("tab", next)
      if (id) params.set("id", id)
      const qs = params.toString()
      router.replace(qs ? `?${qs}` : "?", { scroll: false })
    },
    [router, kind]
  )

  const setDraft = useCallback((updater: (d: ComposeDraft) => ComposeDraft) => setDraftState(updater), [])

  const openCompose = (type?: NoticeType) => {
    if (type && !isDraftDirty(draft)) setDraftState(emptyDraft(type))
    else if (type) setDraftState((d) => ({ ...d, type }))
    go("compose")
  }

  const tabs = useMemo(() => {
    if (kind === "parent") return []
    const list: { key: Tab; label: string; count?: number; tone?: "red" | "amber" | "blue" }[] = [
      { key: "overview", label: "Özet" },
    ]
    if (caps?.showInbox) list.push({ key: "inbox", label: "Gelen", count: badges?.unreadNotices, tone: "amber" })
    if (caps?.sendOfficial) list.push({ key: "sent", label: "Gönderilenler" })
    list.push({
      key: "requests",
      label: caps?.approveRequests ? "Talepler" : "Taleplerim",
      count: caps?.approveRequests ? badges?.pendingRequests : badges?.decidedRequests,
      tone: caps?.approveRequests ? "red" : "blue",
    })
    list.push({ key: "groups", label: "Sınıf Grupları", count: badges?.unreadMessages, tone: "blue" })
    if (caps?.manageTemplates) list.push({ key: "templates", label: "Şablonlar" })
    if (caps?.manageGrants) list.push({ key: "grants", label: "Yetkiler" })
    return list
  }, [kind, caps, badges])

  // Yetkisi olmayan sekmeye düşülürse özete dön
  useEffect(() => {
    if (kind !== "staff" || !caps) return
    const allowed =
      tab === "compose"
        ? caps.sendOfficial
        : tab === "overview" || tabs.some((t) => t.key === tab)
    if (!allowed) setTab("overview")
  }, [caps, kind, tab, tabs])

  if (!me) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col bg-white">
        <Spinner />
      </div>
    )
  }

  const onChanged = () => void loadMe()

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-white">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-slate-900">İç Haberleşme</h1>
          <p className="truncate text-sm text-slate-500">
            {kind === "staff"
              ? caps?.sendOfficial
                ? "Personele resmi ileti, talep yönetimi ve sınıf grupları"
                : "Resmi iletiler, talepleriniz ve sınıf grupları"
              : "Sınıf grubu sohbeti ve okul duyuruları"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {kind === "staff" && caps?.sendOfficial && tab !== "compose" ? (
            <Button size="sm" onClick={() => openCompose()}>
              <Plus className="mr-1 h-4 w-4" />
              Yeni ileti
              {isDraftDirty(draft) ? <span className="ml-1.5 text-[10px] opacity-80">(taslak)</span> : null}
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            title="Yenile"
            onClick={() => {
              void loadMe()
              setPanelKey((k) => k + 1)
              notifyCommsUnreadChanged()
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {tabs.length > 1 ? (
        <nav className="border-b bg-slate-50/80 px-2 sm:px-4">
          <div className="-mb-px flex gap-1 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => go(t.key)}
                className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-semibold transition ${
                  tab === t.key
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                {t.label}
                <CountBadge count={t.count} tone={t.tone} />
              </button>
            ))}
          </div>
        </nav>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col">
        {kind === "parent" ? (
          <GroupsPanel
            kind="parent"
            actorId={me.actor.id}
            canCreate={false}
            canSendAnnouncement={false}
            focusGroupId={searchParams.get("group") || focusId}
            onChanged={onChanged}
          />
        ) : tab === "overview" ? (
          <OverviewPanel
            key={panelKey}
            me={me}
            onGo={(g) => go(g.tab, g.id ?? null)}
            onCompose={(t) => openCompose(t)}
          />
        ) : tab === "compose" && caps?.sendOfficial ? (
          <ComposeNotice
            draft={draft}
            setDraft={setDraft}
            onCancel={() => (isDraftDirty(draft) ? setConfirmDiscard(true) : go("overview"))}
            onSent={(batchId) => {
              setDraftState(emptyDraft())
              go("sent", batchId)
            }}
          />
        ) : tab === "inbox" ? (
          <InboxPanel key={panelKey} focusId={focusId} onChanged={onChanged} />
        ) : tab === "sent" ? (
          <SentPanel
            key={panelKey}
            canViewAll={Boolean(caps?.viewAllNotices)}
            focusBatchId={focusId}
            onCompose={() => openCompose()}
          />
        ) : tab === "requests" ? (
          <RequestsPanel
            key={panelKey}
            canApprove={Boolean(caps?.approveRequests)}
            canCreate={Boolean(caps?.createRequest)}
            canDelete={Boolean(caps?.deleteComms)}
            focusId={focusId}
            onChanged={onChanged}
          />
        ) : tab === "groups" ? (
          <GroupsPanel
            key={panelKey}
            kind="staff"
            actorId={me.actor.id}
            canCreate={Boolean(caps?.createClassGroup)}
            canSendAnnouncement={Boolean(caps?.sendClassAnnouncement)}
            focusGroupId={focusId}
            onChanged={onChanged}
          />
        ) : tab === "templates" ? (
          <TemplatesAdmin key={panelKey} />
        ) : tab === "grants" ? (
          <GrantsAdmin key={panelKey} />
        ) : (
          <Spinner />
        )}
      </div>

      <ConfirmDialog
        open={confirmDiscard}
        title="Taslak silinsin mi?"
        description="Yazdığınız ileti ve seçtiğiniz alıcılar kaybolur. Taslağı saklamak için başka bir sekmeye geçebilirsiniz; “Yeni ileti” ile geri dönersiniz."
        confirmLabel="Taslağı sil"
        destructive
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setDraftState(emptyDraft())
          setConfirmDiscard(false)
          go("overview")
        }}
      />
    </div>
  )
}
