"use client"

import { useEffect, useMemo, useState } from "react"
import type { LucideIcon } from "lucide-react"
import { ArrowDown, ArrowUp, GripVertical, Loader2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { applyNavOrder } from "@/lib/nav-order"
import { saveNavOrder, useNavOrder } from "@/lib/nav-order-client"

export type NavOrderItem = { name: string; href: string; icon?: LucideIcon }

function sameOrder(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((href, i) => href === b[i])
}

/**
 * Kenar menü sırasını düzenleme. Sıra sunucuda kişi başına tutulur ve mobil uygulamada da
 * aynı şekilde uygulanır.
 */
export function NavOrderSettings({ items }: { items: NavOrderItem[] }) {
  const saved = useNavOrder()
  const defaultHrefs = useMemo(() => items.map((item) => item.href), [items])
  const savedHrefs = useMemo(
    () => applyNavOrder(items, saved, (item) => item.href).map((item) => item.href),
    [items, saved],
  )

  const [draft, setDraft] = useState<string[]>(savedHrefs)
  const [dirty, setDirty] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null)

  // Kullanıcı düzenlemiyorsa, kayıt/yetki değişikliklerinde listeyi yenile.
  useEffect(() => {
    if (!dirty) setDraft(savedHrefs)
  }, [savedHrefs, dirty])

  const byHref = useMemo(() => new Map(items.map((item) => [item.href, item])), [items])
  const rows = draft.map((href) => byHref.get(href)).filter((item): item is NavOrderItem => Boolean(item))

  function move(from: number, to: number) {
    if (to < 0 || to >= draft.length || from === to) return
    const next = [...draft]
    const [picked] = next.splice(from, 1)
    next.splice(to, 0, picked)
    setDraft(next)
    setDirty(true)
    setMessage(null)
  }

  async function persist(order: string[], okText: string) {
    setBusy(true)
    setMessage(null)
    try {
      await saveNavOrder(order)
      setDirty(false)
      setMessage({ tone: "ok", text: okText })
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Kaydedilemedi." })
    } finally {
      setBusy(false)
    }
  }

  const isDefault = sameOrder(draft, defaultHrefs)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Menü düzeni</CardTitle>
        <p className="text-sm text-slate-500">
          Kenar menüdeki sekmelerin sırasını belirleyin. Sürükleyip bırakabilir ya da oklarla
          taşıyabilirsiniz. Sıra hem web'de hem mobil uygulamada geçerli olur.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Menü yükleniyor…
          </p>
        ) : (
          <ol className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {rows.map((item, index) => {
              const Icon = item.icon
              return (
                <li
                  key={item.href}
                  draggable
                  onDragStart={(event) => {
                    setDragIndex(index)
                    event.dataTransfer.effectAllowed = "move"
                  }}
                  onDragOver={(event) => {
                    event.preventDefault()
                    if (dragIndex === null || dragIndex === index) return
                    move(dragIndex, index)
                    setDragIndex(index)
                  }}
                  onDragEnd={() => setDragIndex(null)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 text-sm",
                    dragIndex === index && "bg-blue-50",
                  )}
                >
                  <GripVertical className="h-4 w-4 flex-shrink-0 cursor-grab text-slate-400" aria-hidden />
                  <span className="w-6 text-right tabular-nums text-xs text-slate-400">{index + 1}</span>
                  {Icon ? <Icon className="h-4 w-4 flex-shrink-0 text-slate-500" aria-hidden /> : null}
                  <span className="flex-1 font-medium text-slate-800">{item.name}</span>
                  <button
                    type="button"
                    onClick={() => move(index, index - 1)}
                    disabled={index === 0 || busy}
                    className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                    aria-label={`${item.name} yukarı taşı`}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, index + 1)}
                    disabled={index === rows.length - 1 || busy}
                    className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                    aria-label={`${item.name} aşağı taşı`}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </li>
              )
            })}
          </ol>
        )}

        {message ? (
          <p className={cn("text-sm", message.tone === "ok" ? "text-emerald-700" : "text-red-600")} role="status">
            {message.text}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => void persist(draft, "Menü sırası kaydedildi.")}
            disabled={busy || !dirty}
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Kaydet
          </Button>
          {dirty ? (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                setDraft(savedHrefs)
                setDirty(false)
                setMessage(null)
              }}
            >
              Vazgeç
            </Button>
          ) : null}
          <Button
            variant="ghost"
            disabled={busy || (isDefault && !saved?.length)}
            onClick={() => void persist([], "Menü varsayılan sıraya döndü.")}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Varsayılana dön
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
