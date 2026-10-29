"use client"

import { useCallback, useEffect, useState } from "react"
import { getAuthHeaders } from "./auth"
import { COMMS_UNREAD_EVENT } from "./unread-events"

export function UnreadBadge({ className = "" }: { className?: string }) {
  const [count, setCount] = useState(0)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/comms/unread-count", {
        headers: getAuthHeaders(),
        cache: "no-store",
      })
      if (!res.ok) return
      const json = await res.json()
      if (typeof json.count === "number") setCount(json.count)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    void refresh()
    const interval = setInterval(refresh, 30_000)
    const onChanged = () => void refresh()
    window.addEventListener(COMMS_UNREAD_EVENT, onChanged)
    window.addEventListener("focus", onChanged)
    return () => {
      clearInterval(interval)
      window.removeEventListener(COMMS_UNREAD_EVENT, onChanged)
      window.removeEventListener("focus", onChanged)
    }
  }, [refresh])

  if (count <= 0) return null
  return (
    <span
      className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white ${className}`}
      aria-label={`${count} okunmamış kayıt`}
    >
      {count > 99 ? "99+" : count}
    </span>
  )
}
