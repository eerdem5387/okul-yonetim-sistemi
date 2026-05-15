"use client"

import { useMemo } from "react"
import { Megaphone, Users } from "lucide-react"
import {
  conversationDisplayTitle,
  conversationSubtitle,
  formatRelativeTime,
  lastMessagePreview,
} from "./chat-utils"
import type { ChatActorKind, ChatConversation } from "./types"
import { Avatar } from "./Avatar"

interface ConversationListProps {
  conversations: ChatConversation[]
  selectedId: string | null
  onSelect: (id: string) => void
  actor: { kind: ChatActorKind; id: string }
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  actor,
}: ConversationListProps) {
  const sorted = useMemo(
    () =>
      [...conversations].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    [conversations]
  )

  if (sorted.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-gray-500">
        Henüz sohbet yok. Sağ üstten yeni bir sohbet başlatabilirsiniz.
      </div>
    )
  }

  return (
    <ul className="divide-y divide-gray-100">
      {sorted.map((c) => {
        const title = conversationDisplayTitle(c, actor)
        const subtitle = conversationSubtitle(c)
        const isSelected = c.id === selectedId
        const variant: "user" | "group" | "announcement" =
          c.type === "ANNOUNCEMENT" ? "announcement" : c.type === "GROUP" ? "group" : "user"
        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onSelect(c.id)}
              className={`w-full text-left px-3 py-3 flex gap-3 items-start transition-colors hover:bg-gray-50 ${
                isSelected ? "bg-blue-50/60" : ""
              }`}
            >
              <Avatar name={title} variant={variant} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-900 truncate flex items-center gap-1.5">
                    {c.type === "ANNOUNCEMENT" && (
                      <Megaphone className="h-3.5 w-3.5 text-amber-600" />
                    )}
                    {c.type === "GROUP" && (
                      <Users className="h-3.5 w-3.5 text-indigo-600" />
                    )}
                    <span className="truncate">{title}</span>
                  </span>
                  <span className="text-[11px] text-gray-500 flex-shrink-0">
                    {formatRelativeTime(c.updatedAt)}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-500 truncate">
                    {lastMessagePreview(c)}
                  </span>
                  {c.unreadCount > 0 && (
                    <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] font-semibold text-white flex-shrink-0">
                      {c.unreadCount > 99 ? "99+" : c.unreadCount}
                    </span>
                  )}
                </div>
                {subtitle && (
                  <div className="mt-0.5 text-[10px] uppercase tracking-wide text-gray-400">
                    {subtitle}
                  </div>
                )}
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
