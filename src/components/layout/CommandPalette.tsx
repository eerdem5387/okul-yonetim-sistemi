"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, FileText, User, School, Briefcase, CornerDownLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { PAGE_DESCRIPTIONS } from "@/lib/nav-groups"
import { expandTurkishSearchVariants } from "@/lib/turkish-search"

export const OPEN_COMMAND_PALETTE_EVENT = "open-command-palette"

type PageLink = { name: string; href: string }
type Hit = { id: string; name: string; detail?: string | null }
type SearchResult = { students: Hit[]; classes: Hit[]; staff: Hit[] }
type Row = { key: string; group: string; label: string; detail?: string | null; href: string; icon: typeof Search }

const EMPTY: SearchResult = { students: [], classes: [], staff: [] }

function normalize(text: string): string {
  return text.toLocaleLowerCase("tr-TR")
}

function matchesPage(page: PageLink, query: string): boolean {
  const haystack = normalize(`${page.name} ${PAGE_DESCRIPTIONS[page.href] ?? ""}`)
  return query
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => expandTurkishSearchVariants(token).some((v) => haystack.includes(normalize(v))))
}

/**
 * Ctrl+K (Mac'te ⌘K) ile açılan genel arama: menü sayfaları + öğrenci, sınıf, personel.
 * Yalnızca gezinme sağlar; hiçbir veriyi değiştirmez.
 */
export function CommandPalette({ pages }: { pages: PageLink[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [result, setResult] = useState<SearchResult>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    const onOpen = () => setOpen(true)
    window.addEventListener("keydown", onKey)
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpen)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpen)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setQuery("")
      setResult(EMPTY)
      setCursor(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  useEffect(() => {
    const q = query.trim()
    if (!open || q.length < 2) {
      setResult(EMPTY)
      setLoading(false)
      return
    }
    setLoading(true)
    const controller = new AbortController()
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal, cache: "no-store" })
        .then((res) => (res.ok ? res.json() : EMPTY))
        .then((data: SearchResult) => setResult({ ...EMPTY, ...data }))
        .catch(() => undefined)
        .finally(() => setLoading(false))
    }, 200)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, open])

  const rows: Row[] = useMemo(() => {
    const q = query.trim()
    const pageRows = (q ? pages.filter((p) => matchesPage(p, q)) : pages).slice(0, q ? 6 : 8).map((p) => ({
      key: `page:${p.href}`,
      group: "Sayfalar",
      label: p.name,
      detail: PAGE_DESCRIPTIONS[p.href],
      href: p.href,
      icon: FileText,
    }))
    return [
      ...pageRows,
      ...result.students.map((s) => ({ key: `s:${s.id}`, group: "Öğrenciler", label: s.name, detail: s.detail, href: `/students/${s.id}`, icon: User })),
      ...result.classes.map((c) => ({ key: `c:${c.id}`, group: "Sınıflar", label: c.name, detail: c.detail, href: `/sinif-yonetimi/${c.id}`, icon: School })),
      ...result.staff.map((p) => ({ key: `p:${p.id}`, group: "Personel", label: p.name, detail: p.detail, href: `/personel/${p.id}`, icon: Briefcase })),
    ]
  }, [pages, query, result])

  useEffect(() => {
    setCursor((c) => Math.min(c, Math.max(rows.length - 1, 0)))
  }, [rows.length])

  if (!open) return null

  const go = (row: Row | undefined) => {
    if (!row) return
    setOpen(false)
    router.push(row.href)
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 px-4 pt-[12vh] backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false)
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Genel arama"
    >
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="flex items-center gap-3 border-b border-gray-100 px-4">
          <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setCursor(0)
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpen(false)
              else if (event.key === "ArrowDown") {
                event.preventDefault()
                setCursor((c) => Math.min(c + 1, rows.length - 1))
              } else if (event.key === "ArrowUp") {
                event.preventDefault()
                setCursor((c) => Math.max(c - 1, 0))
              } else if (event.key === "Enter") {
                event.preventDefault()
                go(rows[cursor])
              }
            }}
            placeholder="Öğrenci adı / TC, sınıf (ör. 7A), personel veya sayfa adı yazın…"
            className="h-14 flex-1 bg-transparent text-base text-gray-900 outline-none placeholder:text-gray-400"
          />
          <kbd className="rounded border border-gray-200 px-1.5 text-[10px] text-gray-400">Esc</kbd>
        </div>
        <div className="max-h-[60vh] overflow-y-auto py-2">
          {rows.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-500">
              {loading ? "Aranıyor…" : query.trim().length < 2 ? "Aramak için en az 2 harf yazın." : "Sonuç bulunamadı."}
            </p>
          ) : (
            rows.map((row, index) => {
              const showGroup = index === 0 || rows[index - 1].group !== row.group
              const Icon = row.icon
              return (
                <div key={row.key}>
                  {showGroup ? (
                    <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{row.group}</p>
                  ) : null}
                  <button
                    type="button"
                    onMouseEnter={() => setCursor(index)}
                    onClick={() => go(row)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2 text-left",
                      index === cursor ? "bg-blue-50" : "hover:bg-gray-50"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 flex-shrink-0", index === cursor ? "text-blue-600" : "text-gray-400")} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-gray-900">{row.label}</span>
                      {row.detail ? <span className="block truncate text-xs text-gray-500">{row.detail}</span> : null}
                    </span>
                    {index === cursor ? <CornerDownLeft className="h-4 w-4 text-blue-500" aria-hidden="true" /> : null}
                  </button>
                </div>
              )
            })
          )}
          {loading && rows.length > 0 ? <p className="px-4 py-2 text-xs text-gray-400">Aranıyor…</p> : null}
        </div>
      </div>
    </div>
  )
}
