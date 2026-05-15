"use client"

import { FileText, Download } from "lucide-react"
import type { ChatActorKind, ChatMessage } from "./types"
import { departmentLabel, formatRelativeTime } from "./chat-utils"

interface Props {
  message: ChatMessage
  isOwn: boolean
  actorKind: ChatActorKind
}

export function MessageBubble({ message, isOwn }: Props) {
  const senderName = message.sender?.displayName || "Bilinmeyen"
  const senderDept =
    message.sender?.kind === "staff" && message.sender.department
      ? departmentLabel(message.sender.department)
      : null

  const align = isOwn ? "items-end" : "items-start"
  const bubbleColor = isOwn
    ? "bg-blue-600 text-white"
    : "bg-white text-gray-900 border border-gray-200"
  const meta = isOwn ? "text-blue-100" : "text-gray-500"

  return (
    <div className={`flex flex-col ${align}`}>
      {!isOwn && (
        <div className="mb-0.5 text-[11px] text-gray-500 px-2">
          <span className="font-medium text-gray-700">{senderName}</span>
          {senderDept && <span className="ml-1.5 text-gray-400">· {senderDept}</span>}
        </div>
      )}
      <div className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-sm ${bubbleColor}`}>
        {message.type === "IMAGE" && message.attachmentUrl && (
          <a
            href={message.attachmentUrl}
            target="_blank"
            rel="noreferrer"
            className="block mb-1 overflow-hidden rounded-lg"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={message.attachmentUrl}
              alt="Görsel ek"
              className="max-h-72 w-auto rounded-md"
            />
          </a>
        )}
        {message.type === "DOCUMENT" && message.attachmentUrl && (
          <a
            href={message.attachmentUrl}
            target="_blank"
            rel="noreferrer"
            className={`mb-1 inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
              isOwn ? "bg-blue-500/40 text-white" : "bg-gray-50 text-gray-700"
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Belgeyi aç</span>
            <Download className="h-3.5 w-3.5 opacity-70" />
          </a>
        )}
        {message.body && (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.body}</p>
        )}
        <div className={`mt-1 text-[10px] ${meta}`}>{formatRelativeTime(message.createdAt)}</div>
      </div>
    </div>
  )
}
