"use client"

import { useEffect, useState } from "react"
import { getAuthHeaders } from "./auth"

export function UnreadBadge({ className = "" }: { className?: string }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const refresh = async () => {
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
    }
    void refresh()
    const interval = setInterval(refresh, 60_000)
    return () => clearInterval(interval)
  }, [])

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
