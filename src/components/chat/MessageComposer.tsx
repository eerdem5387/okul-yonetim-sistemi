"use client"

import { useRef, useState } from "react"
import { Paperclip, Send, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  disabled?: boolean
  disabledMessage?: string
  onSend: (input: {
    body: string
    type: "TEXT" | "IMAGE" | "DOCUMENT"
    attachmentUrl?: string | null
  }) => Promise<void> | void
  onUpload: (file: File) => Promise<{ url: string; type: "IMAGE" | "DOCUMENT" } | null>
}

export function MessageComposer({ disabled, disabledMessage, onSend, onUpload }: Props) {
  const [text, setText] = useState("")
  const [attachment, setAttachment] = useState<{ url: string; type: "IMAGE" | "DOCUMENT"; name: string } | null>(null)
  const [progress, setProgress] = useState<number>(0)
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (disabled) {
    return (
      <div className="border-t bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
        {disabledMessage || "Bu sohbette mesaj gönderemezsiniz."}
      </div>
    )
  }

  const triggerUpload = () => fileInputRef.current?.click()

  const handleFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setUploading(true)
    setProgress(15)
    try {
      // Naive client progress: 15 → 60 → 85 (gerçek progres XHR ile yapılabilir, şimdilik göstergesel)
      const tick = setInterval(
        () => setProgress((p) => (p < 85 ? p + 5 : p)),
        180
      )
      const result = await onUpload(file)
      clearInterval(tick)
      if (result) {
        setAttachment({ url: result.url, type: result.type, name: file.name })
        setProgress(100)
      } else {
        setProgress(0)
      }
    } finally {
      setUploading(false)
      setTimeout(() => setProgress(0), 600)
    }
  }

  const handleSend = async () => {
    if (sending) return
    const body = text.trim()
    if (!attachment && !body) return
    setSending(true)
    try {
      await onSend({
        body,
        type: attachment ? attachment.type : "TEXT",
        attachmentUrl: attachment?.url ?? null,
      })
      setText("")
      setAttachment(null)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="border-t bg-white p-3">
      {attachment && (
        <div className="mb-2 flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5">
          {attachment.type === "IMAGE" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={attachment.url} alt="Önizleme" className="h-10 w-10 rounded object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded bg-blue-50 text-blue-700">
              <Paperclip className="h-4 w-4" />
            </div>
          )}
          <div className="flex-1 truncate text-sm">{attachment.name}</div>
          <button
            type="button"
            className="rounded-md p-1 text-gray-500 hover:bg-gray-200"
            onClick={() => setAttachment(null)}
            aria-label="Eki kaldır"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {uploading && (
        <div className="mb-2 h-1.5 w-full overflow-hidden rounded bg-gray-100">
          <div
            className="h-full bg-blue-500 transition-[width] duration-200 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain"
          onChange={handleFile}
        />
        <button
          type="button"
          onClick={triggerUpload}
          className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
          aria-label="Dosya ekle"
          disabled={uploading || sending}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              void handleSend()
            }
          }}
          rows={1}
          placeholder="Mesaj yazın…"
          className="min-h-[40px] max-h-32 flex-1 resize-none rounded-2xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
        />
        <Button
          type="button"
          size="sm"
          onClick={handleSend}
          disabled={sending || (!text.trim() && !attachment)}
          className="h-10"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}
