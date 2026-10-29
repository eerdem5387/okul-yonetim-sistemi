"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Plus, Search, Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConversationList } from "./ConversationList"
import { ConversationView } from "./ConversationView"
import { NewConversationDialog } from "./NewConversationDialog"
import { MassMessageDialog } from "./MassMessageDialog"
import { useChatRealtime } from "./useChatRealtime"
import { getAuthHeaders } from "./chat-utils"
import type { ChatActorKind, ChatConversation } from "./types"

interface ChatLayoutProps {
  actor: { kind: ChatActorKind; id: string; department?: string | null }
}

const ANNOUNCEMENT_CREATOR_DEPS = new Set([
  "SUPER_ADMIN",
  "MUDUR",
  "MUDUR_YARDIMCISI",
  "KURUCU",
  "OGRENCI_ISLERI",
])

export function ChatLayout({ actor }: ChatLayoutProps) {
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [showMass, setShowMass] = useState(false)
  const [inbox, setInbox] = useState<"groups" | "announcements" | "parents">("groups")
  const [search, setSearch] = useState("")
  const deepLinkApplied = useRef(false)

  const canCreateGroup = actor.kind === "staff" && ANNOUNCEMENT_CREATOR_DEPS.has(actor.department || "")
  const canCreateAnnouncement = canCreateGroup
  const canMassMessage = canCreateGroup

  const fetchConversations = useCallback(async (query?: string) => {
    try {
      const q = query?.trim()
      const res = await fetch(q ? `/api/chat/conversations?q=${encodeURIComponent(q)}` : "/api/chat/conversations", {
        headers: getAuthHeaders(),
        cache: "no-store",
      })
      const json = await res.json()
      if (res.ok && Array.isArray(json.conversations)) {
        setConversations(json.conversations)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void fetchConversations(search)
    }, 250)
    return () => window.clearTimeout(handle)
  }, [fetchConversations, search])

  useEffect(() => {
    if (deepLinkApplied.current || conversations.length === 0) return
    const id = new URLSearchParams(window.location.search).get("c")
    if (!id) return
    const conv = conversations.find((row) => row.id === id)
    if (!conv) return
    deepLinkApplied.current = true
    setSelectedId(id)
    if (actor.kind === "staff") {
      setInbox(
        conv.type === "ANNOUNCEMENT" ? "announcements" : conv.type === "GROUP" ? "groups" : "parents"
      )
    }
  }, [actor.kind, conversations])

  useChatRealtime({
    conversationId: null,
    actorKind: actor.kind,
    actorId: actor.id,
    onConversationUpdated: () => {
      void fetchConversations(search)
    },
  })

  const visibleConversations = useMemo(() => {
    if (actor.kind !== "staff") return conversations
    if (inbox === "announcements") return conversations.filter((row) => row.type === "ANNOUNCEMENT")
    if (inbox === "parents") return conversations.filter((row) => row.type === "PRIVATE")
    return conversations.filter((row) => row.type === "GROUP")
  }, [actor.kind, conversations, inbox])

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) || null,
    [conversations, selectedId]
  )

  const handleDeleted = useCallback(
    (id: string) => {
      setConversations((prev) => prev.filter((row) => row.id !== id))
      setSelectedId((current) => (current === id ? null : current))
      void fetchConversations(search)
    },
    [fetchConversations, search]
  )

  const pageTitle = actor.kind === "staff" ? "İç Haberleşme Sistemi" : "Mesajlar"

  return (
    <div className="flex h-full min-h-0 flex-1">
      {/* Sol panel: sohbet listesi */}
      <aside className="hidden w-[340px] flex-col border-r bg-white sm:flex">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <h1 className="text-base font-semibold text-gray-900">{pageTitle}</h1>
          <div className="flex items-center gap-1">
            {canMassMessage && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowMass(true)}
                title="Toplu mesaj"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
            <Button size="sm" onClick={() => setShowNew(true)} title="Yeni sohbet">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <InboxTools
          actorKind={actor.kind}
          inbox={inbox}
          onInbox={setInbox}
          search={search}
          onSearch={setSearch}
          counts={{
            groups: conversations.filter((row) => row.type === "GROUP").length,
            announcements: conversations.filter((row) => row.type === "ANNOUNCEMENT").length,
            parents: conversations.filter((row) => row.type === "PRIVATE").length,
          }}
        />
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <ConversationList
              conversations={visibleConversations}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onDeleted={handleDeleted}
              actor={actor}
            />
          )}
        </div>
      </aside>

      {/* Mobile listesi (sm altında) */}
      <div className="flex w-full flex-col sm:hidden">
        {selected ? (
          <ConversationView
            conversation={selected}
            actor={actor}
            onConversationsChanged={fetchConversations}
            onDeleted={handleDeleted}
          />
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 border-b bg-white px-4 py-3">
              <h1 className="text-base font-semibold text-gray-900">{pageTitle}</h1>
              <div className="flex items-center gap-1">
                {canMassMessage && (
                  <Button size="sm" variant="outline" onClick={() => setShowMass(true)}>
                    <Send className="h-4 w-4" />
                  </Button>
                )}
                <Button size="sm" onClick={() => setShowNew(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <InboxTools
              actorKind={actor.kind}
              inbox={inbox}
              onInbox={setInbox}
              search={search}
              onSearch={setSearch}
              counts={{
                groups: conversations.filter((row) => row.type === "GROUP").length,
                announcements: conversations.filter((row) => row.type === "ANNOUNCEMENT").length,
                parents: conversations.filter((row) => row.type === "PRIVATE").length,
              }}
            />
            <div className="flex-1 overflow-y-auto bg-white">
              <ConversationList
                conversations={visibleConversations}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onDeleted={handleDeleted}
                actor={actor}
              />
            </div>
          </>
        )}
      </div>

      {/* Sağ panel: aktif sohbet */}
      <main className="hidden flex-1 flex-col bg-white sm:flex">
        <ConversationView
          conversation={selected}
          actor={actor}
          onConversationsChanged={fetchConversations}
          onDeleted={handleDeleted}
        />
      </main>

      <NewConversationDialog
        open={showNew}
        onOpenChange={setShowNew}
        actorKind={actor.kind}
        canCreateGroup={canCreateGroup}
        canCreateAnnouncement={canCreateAnnouncement}
        onCreated={(id, type) => {
          setSelectedId(id)
          if (type === "ANNOUNCEMENT") setInbox("announcements")
          else if (type === "GROUP") setInbox("groups")
          else if (actor.kind === "staff") setInbox("parents")
          void fetchConversations(search)
        }}
      />
      {canMassMessage && (
        <MassMessageDialog
          open={showMass}
          onOpenChange={setShowMass}
          onSent={() => void fetchConversations()}
        />
      )}
    </div>
  )
}

function InboxTools({
  actorKind,
  inbox,
  onInbox,
  search,
  onSearch,
  counts,
}: {
  actorKind: "staff" | "parent"
  inbox: "groups" | "announcements" | "parents"
  onInbox: (value: "groups" | "announcements" | "parents") => void
  search: string
  onSearch: (value: string) => void
  counts: { groups: number; announcements: number; parents: number }
}) {
  return (
    <div className="border-b bg-white px-3 py-2 space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Kişi, sınıf veya mesaj ara"
          className="w-full rounded-md border border-gray-200 py-1.5 pl-8 pr-2 text-sm outline-none focus:border-blue-400"
        />
      </div>
      {actorKind === "staff" ? (
        <div className="grid grid-cols-3 gap-1 text-xs">
          {(
            [
              ["groups", "Gruplar", counts.groups],
              ["announcements", "Duyurular", counts.announcements],
              ["parents", "Veliler", counts.parents],
            ] as const
          ).map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              onClick={() => onInbox(key)}
              className={`rounded-md px-2 py-1.5 font-medium ${
                inbox === key ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {label} {count}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
