"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Plus, Send, Loader2 } from "lucide-react"
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
  "OGRENCI_ISLERI",
])

export function ChatLayout({ actor }: ChatLayoutProps) {
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [showMass, setShowMass] = useState(false)

  const canCreateGroup = actor.kind === "staff" && ANNOUNCEMENT_CREATOR_DEPS.has(actor.department || "")
  const canCreateAnnouncement = canCreateGroup
  const canMassMessage = canCreateGroup

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/conversations", {
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
    void fetchConversations()
  }, [fetchConversations])

  useChatRealtime({
    conversationId: null,
    actorKind: actor.kind,
    actorId: actor.id,
    onConversationUpdated: () => {
      void fetchConversations()
    },
  })

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) || null,
    [conversations, selectedId]
  )

  return (
    <div className="flex h-full min-h-0 flex-1">
      {/* Sol panel: sohbet listesi */}
      <aside className="hidden w-[340px] flex-col border-r bg-white sm:flex">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <h1 className="text-base font-semibold text-gray-900">Mesajlar</h1>
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
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <ConversationList
              conversations={conversations}
              selectedId={selectedId}
              onSelect={setSelectedId}
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
          />
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 border-b bg-white px-4 py-3">
              <h1 className="text-base font-semibold text-gray-900">Mesajlar</h1>
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
            <div className="flex-1 overflow-y-auto bg-white">
              <ConversationList
                conversations={conversations}
                selectedId={selectedId}
                onSelect={setSelectedId}
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
        />
      </main>

      <NewConversationDialog
        open={showNew}
        onOpenChange={setShowNew}
        actorKind={actor.kind}
        canCreateGroup={canCreateGroup}
        canCreateAnnouncement={canCreateAnnouncement}
        onCreated={(id) => {
          setSelectedId(id)
          void fetchConversations()
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
