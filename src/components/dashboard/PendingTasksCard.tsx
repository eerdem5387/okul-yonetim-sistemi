"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Inbox, ChevronRight, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useMainNavigation } from "@/components/layout/sidebar"

type PendingItem = { key: string; label: string; count: number; href: string }

/**
 * "Bekleyen işlerim": farklı ekranlara dağılmış onay bekleyen işleri tek kartta sayılarla gösterir.
 * Satıra tıklayınca ilgili ekran açılır; işlem her zamanki gibi orada yapılır.
 */
export function PendingTasksCard() {
  const { navigation } = useMainNavigation()
  const [items, setItems] = useState<PendingItem[] | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/me/pending", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data: { items?: PendingItem[] }) => {
        if (!cancelled) setItems(Array.isArray(data.items) ? data.items : [])
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const visibleHrefs = navigation.map((item) => item.href)
  const visible = (items ?? []).filter((item) =>
    visibleHrefs.some((href) => href !== "/" && (item.href === href || item.href.startsWith(`${href}/`)))
  )
  if (items === null || visible.length === 0) return null

  const total = visible.reduce((sum, item) => sum + item.count, 0)

  return (
    <Card className="mb-4 border-0 bg-white/90 shadow-md sm:mb-6">
      <CardHeader className="px-4 pb-2 pt-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Inbox className="h-5 w-5 text-amber-600" aria-hidden="true" />
          <CardTitle className="text-base sm:text-lg">Bekleyen işlerim</CardTitle>
          {total > 0 ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">{total}</span>
          ) : null}
        </div>
        <CardDescription className="text-xs sm:text-sm">Onayınızı veya işleminizi bekleyen kayıtlar</CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4 sm:px-6">
        {total === 0 ? (
          <p className="flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Şu an bekleyen bir işiniz yok.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {visible
              .filter((item) => item.count > 0)
              .map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm transition hover:bg-amber-50"
                  >
                    <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-amber-500 px-2 text-xs font-bold text-white">
                      {item.count}
                    </span>
                    <span className="flex-1 font-medium text-gray-800">{item.label}</span>
                    <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden="true" />
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
