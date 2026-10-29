"use client"

import type { RefObject } from "react"
import { Button } from "@/components/ui/button"
import {
  insertAtCursor,
  NOTICE_PLACEHOLDER_HELP,
  RECIPIENT_NAME_TOKEN,
} from "@/lib/comms/placeholders"

export function PlaceholderInsertBar({
  textareaRef,
  value,
  onChange,
}: {
  textareaRef: RefObject<HTMLTextAreaElement | null>
  value: string
  onChange: (next: string) => void
}) {
  const insert = () => {
    const el = textareaRef.current
    const start = el?.selectionStart ?? value.length
    const end = el?.selectionEnd ?? start
    const { value: next, caret } = insertAtCursor(value, RECIPIENT_NAME_TOKEN, start, end)
    onChange(next)
    requestAnimationFrame(() => {
      if (!el) return
      el.focus()
      el.setSelectionRange(caret, caret)
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={insert}>
        Alıcı ad soyad ekle
      </Button>
      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-700">
        {RECIPIENT_NAME_TOKEN}
      </code>
      <span className="text-xs text-slate-500">{NOTICE_PLACEHOLDER_HELP}</span>
    </div>
  )
}
