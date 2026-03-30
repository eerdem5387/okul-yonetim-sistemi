"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Search,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
  FileDown,
  Pencil,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  MAIN_TYPE_LABELS,
  getSubtypeConfig,
  type ActivityMainType,
} from "@/lib/activity-types-config"

interface Participant {
  id: string
  verificationStatus: string
  student: { id: string; firstName: string; lastName: string; grade: string }
}

interface ActivityEventRow {
  id: string
  mainType: ActivityMainType
  subtype: string | null
  title: string
  startDate: string
  endDate: string
  organizerName: string
  teacher: { firstName: string; lastName: string }
  participants: Participant[]
}

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
  const h: HeadersInit = { "Content-Type": "application/json" }
  if (token) (h as Record<string, string>)["Authorization"] = `Bearer ${token}`
  return h
}

const STATUS_COLORS: Record<string, string> = {
  IMZA_SURECINDE: "bg-slate-100 text-slate-700",
  ONAY_BEKLIYOR: "bg-amber-100 text-amber-700",
  ONAYLANDI: "bg-emerald-100 text-emerald-700",
}

const STATUS_LABELS: Record<string, string> = {
  IMZA_SURECINDE: "İmza Sürecinde",
  ONAY_BEKLIYOR: "Onay Bekliyor",
  ONAYLANDI: "Onaylandı",
}

function getActivityStatus(participants: Participant[]): string {
  if (!participants.length) return "IMZA_SURECINDE"
  const statuses = participants.map((p) => p.verificationStatus)
  if (statuses.every((s) => s === "ONAYLANDI")) return "ONAYLANDI"
  if (statuses.some((s) => s === "ONAY_BEKLIYOR")) return "ONAY_BEKLIYOR"
  return "IMZA_SURECINDE"
}

export function FaaliyetListesi() {
  const [events, setEvents] = useState<ActivityEventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [search, setSearch] = useState("")
  const [mainTypeFilter, setMainTypeFilter] = useState("")
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" })
      if (search) params.set("search", search)
      if (mainTypeFilter) params.set("mainType", mainTypeFilter)

      const res = await fetch(`/api/activity-events?${params}`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setEvents(data.events ?? [])
        setTotalPages(data.pagination?.totalPages ?? 1)
        setTotalCount(data.pagination?.total ?? 0)
      }
    } catch {
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [page, search, mainTypeFilter])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title}" faaliyetini silmek istediğinizden emin misiniz?`)) return
    try {
      const res = await fetch(`/api/activity-events/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        fetchEvents()
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || "Silme işlemi başarısız")
      }
    } catch {
      alert("Silme işlemi başarısız")
    }
  }

  const handleDownloadPdf = async (id: string, title: string) => {
    setDownloadingId(id)
    try {
      const res = await fetch(`/api/activity-events/${id}/pdf`, { headers: getAuthHeaders() })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "PDF alınamadı")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `sertifika-${title.slice(0, 30)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert(e instanceof Error ? e.message : "PDF indirilemedi")
    } finally {
      setDownloadingId(null)
    }
  }

  const MAIN_TYPES = Object.keys(MAIN_TYPE_LABELS) as ActivityMainType[]

  return (
    <div className="space-y-4">
      {/* Filtreler */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Başlık veya organizatör ara..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9"
          />
        </div>
        <select
          value={mainTypeFilter}
          onChange={(e) => { setMainTypeFilter(e.target.value); setPage(1) }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">Tüm Türler</option>
          {MAIN_TYPES.map((t) => (
            <option key={t} value={t}>{MAIN_TYPE_LABELS[t]}</option>
          ))}
        </select>
        {(search || mainTypeFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearch(""); setMainTypeFilter(""); setPage(1) }}
          >
            Sıfırla
          </Button>
        )}
      </div>

      {/* Tablo */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Faaliyet Listesi</h3>
            <p className="text-xs text-gray-500 mt-0.5">Toplam {totalCount} kayıt</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <FileText className="h-12 w-12 mb-3 text-gray-200" />
            <p className="text-sm">Henüz faaliyet kaydı yok</p>
            <p className="text-xs mt-1">Faaliyet eklemek için Faaliyet Ekle veya sertifika modülü sayfasını kullanın</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Başlık</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tür</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Öğretmen</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tarih</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Katılımcı</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Durum</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev) => {
                    const status = getActivityStatus(ev.participants)
                    return (
                      <tr key={ev.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3">
                          <Link
                            href={`/faaliyet-yonetimi/${ev.id}`}
                            className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors"
                          >
                            {ev.title}
                          </Link>
                          {ev.subtype && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {getSubtypeConfig(ev.mainType, ev.subtype)?.label ??
                                ev.subtype.replace(/_/g, " ")}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium text-gray-600">
                            {MAIN_TYPE_LABELS[ev.mainType]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-sm">
                          {ev.teacher.firstName} {ev.teacher.lastName}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(ev.startDate).toLocaleDateString("tr-TR")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1 text-gray-600 text-xs">
                            <Users className="h-3 w-3" />
                            {ev.participants.length} kişi
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}>
                            {status === "ONAYLANDI" && <CheckCircle className="h-3 w-3" />}
                            {status === "ONAY_BEKLIYOR" && <Clock className="h-3 w-3" />}
                            {status === "IMZA_SURECINDE" && <FileText className="h-3 w-3" />}
                            {STATUS_LABELS[status]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                              title="PDF İndir"
                              onClick={() => handleDownloadPdf(ev.id, ev.title)}
                              disabled={downloadingId === ev.id}
                            >
                              {downloadingId === ev.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <FileDown className="h-4 w-4" />
                              )}
                            </Button>
                            <Link href={`/faaliyet-yonetimi/${ev.id}`}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700" title="Düzenle / Detay">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                              title="Sil"
                              onClick={() => handleDelete(ev.id, ev.title)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">Sayfa {page} / {totalPages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
