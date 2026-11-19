"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Info, X } from "lucide-react"
import { PAGE_DESCRIPTIONS } from "@/lib/nav-groups"

const SEEN_KEY = "page_hints_seen"

/**
 * Bir ekran ilk kez açıldığında üstte "Bu ekran ne işe yarar?" açıklaması gösterir.
 * Kapatılınca o ekran için bir daha gösterilmez (bu tarayıcıda).
 */
export function PageHint() {
  const pathname = usePathname() ?? ""
  const text = PAGE_DESCRIPTIONS[pathname]
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!text) {
      setVisible(false)
      return
    }
    try {
      const seen = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]") as string[]
      setVisible(!seen.includes(pathname))
    } catch {
      setVisible(false)
    }
  }, [pathname, text])

  if (!visible || !text) return null

  const dismiss = () => {
    setVisible(false)
    try {
      const seen = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]") as string[]
      localStorage.setItem(SEEN_KEY, JSON.stringify([...new Set([...seen, pathname])]))
    } catch {
      /* yoksay */
    }
  }

  return (
    <div className="mx-3 mt-3 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm text-blue-900 sm:mx-4 md:mx-6 lg:mx-8" role="note">
      <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" aria-hidden="true" />
      <p className="flex-1">
        <span className="font-semibold">Bu ekranda: </span>
        {text} <span className="text-blue-700/80">Genel arama için Ctrl+K.</span>
      </p>
      <button type="button" onClick={dismiss} className="rounded p-0.5 text-blue-500 hover:bg-blue-100 hover:text-blue-700" aria-label="Açıklamayı kapat">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
