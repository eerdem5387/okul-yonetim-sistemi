"use client"

import { useEffect, useState } from "react"
import { staffAuthHeaders } from "@/lib/permissions/client"
import { sanitizeNavOrder } from "@/lib/nav-order"

const CACHE_KEY = "nav_order_cache"
const CHANGE_EVENT = "nav-order-changed"

function readCache(): string[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? sanitizeNavOrder(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

function writeCache(order: string[]) {
  try {
    if (order.length === 0) localStorage.removeItem(CACHE_KEY)
    else localStorage.setItem(CACHE_KEY, JSON.stringify(order))
  } catch {
    // depolama kapalıysa sunucudaki kayıt yeterli
  }
}

/**
 * Kullanıcının kayıtlı menü sırası. Önce yerel önbellekten (anında), sonra sunucudan
 * okunur; Ayarlar'da kaydedilince kenar menü sayfa yenilenmeden güncellenir.
 */
export function useNavOrder(): string[] | null {
  const [order, setOrder] = useState<string[] | null>(null)

  useEffect(() => {
    setOrder(readCache())
    let cancelled = false
    void fetch("/api/me/nav-order", { headers: staffAuthHeaders(), cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { order?: unknown } | null) => {
        if (cancelled || !json) return
        const next = sanitizeNavOrder(json.order)
        writeCache(next)
        setOrder(next)
      })
      .catch(() => undefined)

    const onChange = (event: Event) => {
      setOrder(sanitizeNavOrder((event as CustomEvent<string[]>).detail))
    }
    window.addEventListener(CHANGE_EVENT, onChange)
    return () => {
      cancelled = true
      window.removeEventListener(CHANGE_EVENT, onChange)
    }
  }, [])

  return order
}

/** Sırayı sunucuya kaydeder; boş liste varsayılana döndürür. */
export async function saveNavOrder(order: string[]): Promise<string[]> {
  const res = await fetch("/api/me/nav-order", {
    method: "PUT",
    headers: { ...staffAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ order }),
  })
  const json = (await res.json().catch(() => ({}))) as { order?: unknown; error?: string }
  if (!res.ok) throw new Error(json.error || "Menü sırası kaydedilemedi.")
  const saved = sanitizeNavOrder(json.order)
  writeCache(saved)
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: saved }))
  return saved
}
