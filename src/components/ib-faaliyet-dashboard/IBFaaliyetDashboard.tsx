"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Plus,
  Trash2,
  Search,
  Calendar,
  CheckCircle,
  XCircle,
  Award,
  BarChart3,
  Users,
  FileText,
  Settings,
  Clock,
  ChevronRight,
  Loader2,
  GraduationCap,
  CalendarDays,
  Trophy,
  Medal,
  Pencil,
  Upload,
  FileCheck,
  FileDown,
} from "lucide-react"

export type ActivityVerificationStatus = "IMZA_SURECINDE" | "ONAY_BEKLIYOR" | "ONAYLANDI"

export interface IBDashboardStats {
  total: number
  thisYear: number
  verified: number
  unverified: number
  imzaSurecinde: number
  onayBekliyor: number
  onaylandi: number
  byCategory: Record<string, number>
  topStudents: Array<{
    studentId: string
    fullName: string
    grade: string
    tcNumber: string
    count: number
  }>
}

export interface IBDashboardActivity {
  id: string
  studentId: string
  type: string
  title: string
  description: string | null
  activityDate: string
  isVerified: boolean
  verificationStatus?: ActivityVerificationStatus
  signedDocumentUrls?: string[]
  category?: string | null
  student: { id: string; firstName: string; lastName: string; grade: string }
}

const CATEGORY_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  egitim: { label: "Eğitim", icon: GraduationCap, color: "bg-violet-500/10 text-violet-700 border-violet-200" },
  etkinlik: { label: "Etkinlik", icon: CalendarDays, color: "bg-sky-500/10 text-sky-700 border-sky-200" },
  spor: { label: "Spor", icon: Trophy, color: "bg-amber-500/10 text-amber-700 border-amber-200" },
  yarisma: { label: "Yarışma", icon: Medal, color: "bg-emerald-500/10 text-emerald-700 border-emerald-200" },
}

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
  const h: HeadersInit = { "Content-Type": "application/json" }
  if (token) (h as Record<string, string>)["Authorization"] = `Bearer ${token}`
  return h
}

export interface IBFaaliyetDashboardProps {
  faaliyetEkleHref: string
  studentDetailHref: (studentId: string) => string
  /** Faaliyet düzenleme sayfası linki (id ile). Verilmezse /faaliyet-duzenle/[id] kullanılır. */
  faaliyetDuzenleHref?: (activityId: string) => string
  showViewerButton?: boolean
  onViewerClick?: () => void
}

export function IBFaaliyetDashboard({
  faaliyetEkleHref,
  studentDetailHref,
  faaliyetDuzenleHref = (id) => `/faaliyet-duzenle/${id}`,
  showViewerButton = true,
  onViewerClick,
}: IBFaaliyetDashboardProps) {
  const [stats, setStats] = useState<IBDashboardStats | null>(null)
  const [activities, setActivities] = useState<IBDashboardActivity[]>([])
  const [students, setStudents] = useState<Array<{ id: string; firstName: string; lastName: string; grade: string }>>([])
  const [loading, setLoading] = useState(true)
  const [loadingList, setLoadingList] = useState(false)
  const [studentFilter, setStudentFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [search, setSearch] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [verifiedFilter, setVerifiedFilter] = useState("all")
  const [verificationStatusFilter, setVerificationStatusFilter] = useState("")
  const [page, setPage] = useState(1)
  const [uploadModalActivityId, setUploadModalActivityId] = useState<string | null>(null)
  const [uploadingSigned, setUploadingSigned] = useState(false)
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null)
  const [downloadingBatchPdf, setDownloadingBatchPdf] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [pdfLanguage, setPdfLanguage] = useState<"tr" | "en">("tr")
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/activities/stats", { headers: getAuthHeaders() })
      if (res.ok) setStats(await res.json())
    } catch {
      setStats(null)
    }
  }, [])

  const fetchActivities = useCallback(async () => {
    setLoadingList(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" })
      if (studentFilter) params.set("studentId", studentFilter)
      if (typeFilter) params.set("type", typeFilter)
      if (categoryFilter) params.set("category", categoryFilter)
      if (search) params.set("search", search)
      if (startDate) params.set("startDate", startDate)
      if (endDate) params.set("endDate", endDate)
      if (verificationStatusFilter) params.set("verificationStatus", verificationStatusFilter)
      else if (verifiedFilter !== "all") params.set("isVerified", verifiedFilter)
      const res = await fetch(`/api/activities?${params}`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setActivities(data.activities ?? [])
        setTotalPages(data.pagination?.totalPages ?? 1)
        setTotalCount(data.pagination?.total ?? 0)
      }
    } catch {
      setActivities([])
    } finally {
      setLoadingList(false)
    }
  }, [page, studentFilter, typeFilter, categoryFilter, search, startDate, endDate, verifiedFilter, verificationStatusFilter])

  const fetchStudents = useCallback(async () => {
    try {
      const res = await fetch("/api/students?limit=2000", { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        const list = Array.isArray(data) ? data : data.students ?? []
        setStudents(list)
      }
    } catch {
      setStudents([])
    }
  }, [])

  useEffect(() => {
    fetchStats()
    fetchStudents()
  }, [fetchStats, fetchStudents])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  const handleVerify = async (id: string, approved: boolean) => {
    try {
      const res = await fetch(`/api/activities/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          verificationStatus: approved ? "ONAYLANDI" : "ONAY_BEKLIYOR",
          verifiedAt: approved ? new Date().toISOString() : undefined,
        }),
      })
      if (res.ok) {
        fetchStats()
        fetchActivities()
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || "Onay işlemi başarısız.")
      }
    } catch {
      alert("Onay işlemi başarısız.")
    }
  }

  const handleDownloadPdf = async (activityId: string) => {
    setDownloadingPdfId(activityId)
    try {
      const res = await fetch(`/api/activities/${activityId}/pdf?lang=${pdfLanguage}`, {
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error || "PDF alınamadı")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const disposition = res.headers.get("Content-Disposition")
      const match = disposition?.match(/filename="?([^";]+)"?/)
      const fileName = match?.[1]?.trim() || `faaliyet-${activityId}.pdf`
      const a = document.createElement("a")
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert(e instanceof Error ? e.message : "PDF indirilemedi.")
    } finally {
      setDownloadingPdfId(null)
    }
  }

  const handleDownloadBatchPdf = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setDownloadingBatchPdf(true)
    try {
      const res = await fetch("/api/activities/batch-pdf", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ activityIds: ids, lang: pdfLanguage }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error || "PDF alınamadı")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const disposition = res.headers.get("Content-Disposition")
      const match = disposition?.match(/filename="?([^";]+)"?/)
      const fileName = match?.[1]?.trim() || `faaliyet-${ids.length}-ogrenci.pdf`
      const a = document.createElement("a")
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
      setSelectedIds(new Set())
    } catch (e) {
      alert(e instanceof Error ? e.message : "PDF indirilemedi.")
    } finally {
      setDownloadingBatchPdf(false)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size >= activities.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(activities.map((a) => a.id)))
    }
  }

  const handleUploadSignedDocuments = async (activityId: string, files: FileList | null) => {
    if (!files?.length) return
    setUploadingSigned(true)
    try {
      const urls: string[] = []
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData()
        formData.append("file", files[i])
        const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
        const res = await fetch("/api/activities/upload?type=signed_document", {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || "Yükleme başarısız")
        if (data.url) urls.push(data.url)
      }
      if (urls.length === 0) throw new Error("Yüklenen dosya URL'si alınamadı")
      const putRes = await fetch(`/api/activities/${activityId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ verificationStatus: "ONAY_BEKLIYOR", signedDocumentUrls: urls }),
      })
      if (putRes.ok) {
        setUploadModalActivityId(null)
        fetchStats()
        fetchActivities()
      } else {
        const err = await putRes.json().catch(() => ({}))
        throw new Error(err.error || "Durum güncellenemedi")
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "İmzalı belge yüklenirken hata oluştu.")
    } finally {
      setUploadingSigned(false)
    }
  }

  const handleDelete = async (id: string, title?: string) => {
    const message = title
      ? `"${title}" faaliyetini silmek istediğinizden emin misiniz?`
      : "Bu faaliyeti silmek istediğinizden emin misiniz?"
    if (!confirm(message)) return
    try {
      const res = await fetch(`/api/activities/${id}`, { method: "DELETE", headers: getAuthHeaders() })
      if (res.ok) {
        fetchStats()
        fetchActivities()
      } else alert("Silme işlemi başarısız.")
    } catch {
      alert("Silme işlemi başarısız.")
    }
  }

  const resetFilters = () => {
    setStudentFilter("")
    setTypeFilter("")
    setCategoryFilter("")
    setSearch("")
    setStartDate("")
    setEndDate("")
    setVerifiedFilter("all")
    setVerificationStatusFilter("")
    setPage(1)
  }

  const typeLabels: Record<string, string> = {
    ETKINLIK: "Etkinlik",
    GEZI: "Gezi",
    PROJE: "Proje",
    SINAV: "Sınav",
    YARISMA: "Yarışma",
    SEMINER: "Seminer",
    WORKSHOP: "Workshop",
    SPORT: "Spor",
    SANAT: "Sanat",
    SOSYAL: "Sosyal",
    DIL: "Dil",
    BILIM: "Bilim",
    DEGER: "Değerler",
    DIGER: "Diğer",
  }

  if (loading && !stats) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 px-6 py-8 text-white shadow-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">IB Faaliyet Yönetimi</h1>
            <p className="mt-1 text-indigo-100">
              Öğrenci faaliyetlerini yönetin, doğrulayın ve IB programına hazırlayın
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {showViewerButton && onViewerClick && (
              <Button variant="secondary" size="sm" onClick={onViewerClick} className="bg-white/20 hover:bg-white/30 text-white border-0">
                <Settings className="h-4 w-4 mr-2" />
                IB Viewer
              </Button>
            )}
            <Link href={faaliyetEkleHref}>
              <Button size="sm" className="bg-white text-indigo-700 hover:bg-indigo-50 shadow">
                <Plus className="h-4 w-4 mr-2" />
                Faaliyet Ekle
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI - Doğrulama protokolü: İmza sürecinde → Onay bekliyor → Onaylandı */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-0 bg-white shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Toplam Faaliyet</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">{stats?.total ?? 0}</p>
                <p className="mt-0.5 text-xs text-gray-500">Bu yıl: {stats?.thisYear ?? 0}</p>
              </div>
              <div className="rounded-xl bg-indigo-100 p-3">
                <BarChart3 className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">İmza sürecinde</p>
                <p className="mt-1 text-3xl font-bold text-slate-600">{stats?.imzaSurecinde ?? 0}</p>
                <p className="mt-0.5 text-xs text-gray-500">İmzalı belge yüklenecek</p>
              </div>
              <div className="rounded-xl bg-slate-100 p-3">
                <FileText className="h-6 w-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Onay bekliyor</p>
                <p className="mt-1 text-3xl font-bold text-amber-600">{stats?.onayBekliyor ?? 0}</p>
                <p className="mt-0.5 text-xs text-gray-500">İnceleme bekliyor</p>
              </div>
              <div className="rounded-xl bg-amber-100 p-3">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Onaylandı</p>
                <p className="mt-1 text-3xl font-bold text-emerald-600">{stats?.onaylandi ?? 0}</p>
                <p className="mt-0.5 text-xs text-gray-500">IB için hazır</p>
              </div>
              <div className="rounded-xl bg-emerald-100 p-3">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Bu Yıl</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">{stats?.thisYear ?? 0}</p>
                <p className="mt-0.5 text-xs text-gray-500">{new Date().getFullYear()} faaliyetleri</p>
              </div>
              <div className="rounded-xl bg-gray-100 p-3">
                <Award className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Kategoriler */}
        <Card className="border-0 shadow-md lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Kategorilere Göre</CardTitle>
            <CardDescription>Faaliyet Ekle ile uyumlu</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {(Object.entries(CATEGORY_META) as [keyof typeof CATEGORY_META, typeof CATEGORY_META.egitim][]).map(([key, meta]) => {
                const Icon = meta.icon
                const count = stats?.byCategory?.[key] ?? 0
                return (
                  <div
                    key={key}
                    className={`rounded-xl border p-4 ${meta.color}`}
                  >
                    <Icon className="h-5 w-5 mb-1.5 opacity-80" />
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs font-medium opacity-90">{meta.label}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Öğrenciler - ana odak */}
        <Card className="border-0 shadow-md lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" />
                Öğrenciler
              </CardTitle>
              <CardDescription>Katılıma göre sıralı · Detay için tıklayın</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {stats?.topStudents && stats.topStudents.length > 0 ? (
              <ul className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {stats.topStudents.map((s, i) => (
                  <li key={s.studentId}>
                    <Link
                      href={studentDetailHref(s.studentId)}
                      className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 transition-all hover:border-indigo-300 hover:bg-indigo-50/50 hover:shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{s.fullName}</p>
                          <p className="text-xs text-gray-500">{s.grade || "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700">
                          {s.count} faaliyet
                        </span>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Users className="h-12 w-12 mb-3 text-gray-300" />
                <p className="text-sm">Henüz katılım verisi yok</p>
                <p className="text-xs mt-1">Faaliyet Ekle ile kayıt oluşturun</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filtreler */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Search className="h-4 w-4" />
            Filtreleme
          </CardTitle>
          <CardDescription>Listeyi öğrenci, tip, tarih ve duruma göre daraltın</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div>
              <Label className="text-xs">Öğrenci</Label>
              <select
                value={studentFilter}
                onChange={(e) => { setStudentFilter(e.target.value); setPage(1) }}
                className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">Tümü</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.firstName} {s.lastName} {s.grade ? `(${s.grade})` : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Tip</Label>
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
                className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">Tümü</option>
                {Object.entries(typeLabels).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Kategori</Label>
              <select
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}
                className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">Tümü</option>
                {Object.entries(CATEGORY_META).map(([id, { label }]) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Başlangıç</Label>
              <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1) }} className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs">Bitiş</Label>
              <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1) }} className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs">Doğrulama durumu</Label>
              <select
                value={verificationStatusFilter || (verifiedFilter !== "all" ? verifiedFilter : "")}
                onChange={(e) => {
                  const v = e.target.value
                  setVerificationStatusFilter(v === "IMZA_SURECINDE" || v === "ONAY_BEKLIYOR" || v === "ONAYLANDI" ? v : "")
                  setVerifiedFilter(v === "true" ? "true" : v === "false" ? "false" : "all")
                  setPage(1)
                }}
                className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">Tümü</option>
                <option value="IMZA_SURECINDE">İmza sürecinde</option>
                <option value="ONAY_BEKLIYOR">Onay bekliyor</option>
                <option value="ONAYLANDI">Onaylandı</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" size="sm" onClick={resetFilters} className="shrink-0">Sıfırla</Button>
            </div>
          </div>
          <div>
            <Label className="text-xs">Arama</Label>
            <div className="relative mt-1.5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Başlık, açıklama..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Faaliyet listesi */}
      <Card className="border-0 shadow-md">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-semibold">Faaliyet Listesi</CardTitle>
            <CardDescription>Toplam {totalCount} kayıt</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Label className="text-xs text-gray-500 whitespace-nowrap">PDF dili:</Label>
            <select
              value={pdfLanguage}
              onChange={(e) => setPdfLanguage(e.target.value as "tr" | "en")}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm"
            >
              <option value="tr">Türkçe</option>
              <option value="en">English</option>
            </select>
          </div>
          {selectedIds.size > 0 && (
            <Button
              size="sm"
              onClick={handleDownloadBatchPdf}
              disabled={downloadingBatchPdf}
              className="text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100"
            >
              {downloadingBatchPdf ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2 inline" />
              ) : (
                <FileDown className="h-4 w-4 mr-2 inline" />
              )}
              Seçilenlerin PDF&apos;ini indir ({selectedIds.size} öğrenci)
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loadingList ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mb-3 text-gray-300" />
              <p>Filtrelere uygun faaliyet yok</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500">
                      <th className="pb-3 font-medium px-2 w-10">
                        <input
                          type="checkbox"
                          checked={activities.length > 0 && selectedIds.size >= activities.length}
                          onChange={toggleSelectAll}
                          title="Tümünü seç / kaldır"
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="pb-3 font-medium px-2">Başlık</th>
                      <th className="pb-3 font-medium px-2">Öğrenci</th>
                      <th className="pb-3 font-medium px-2">Kategori</th>
                      <th className="pb-3 font-medium px-2">Tür</th>
                      <th className="pb-3 font-medium px-2">Tarih</th>
                      <th className="pb-3 font-medium px-2">Durum</th>
                      <th className="pb-3 font-medium px-2 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.map((a) => (
                      <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="py-3 px-2 w-10">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(a.id)}
                            onChange={() => toggleSelect(a.id)}
                            title="Bu öğrencinin PDF'ine dahil et"
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="py-3 px-2 font-medium text-gray-900">{a.title}</td>
                        <td className="py-3 px-2">
                          <Link href={studentDetailHref(a.studentId)} className="text-indigo-600 hover:underline">
                            {a.student.firstName} {a.student.lastName}
                          </Link>
                          {a.student.grade && <span className="text-gray-500 ml-1">({a.student.grade})</span>}
                        </td>
                        <td className="py-3 px-2">
                          {a.category && CATEGORY_META[a.category] ? (
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${CATEGORY_META[a.category].color}`}>
                              {CATEGORY_META[a.category].label}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-gray-600">{typeLabels[a.type] ?? a.type}</td>
                        <td className="py-3 px-2 text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(a.activityDate).toLocaleDateString("tr-TR")}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          {(a.verificationStatus ?? (a.isVerified ? "ONAYLANDI" : "IMZA_SURECINDE")) === "ONAYLANDI" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                              <CheckCircle className="h-3.5 w-3.5" /> Onaylandı
                            </span>
                          ) : (a.verificationStatus ?? "") === "ONAY_BEKLIYOR" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                              <Clock className="h-3.5 w-3.5" /> Onay bekliyor
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                              <FileText className="h-3.5 w-3.5" /> İmza sürecinde
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex justify-end gap-1 flex-wrap">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 h-8 w-8 p-0"
                              title="PDF İndir"
                              onClick={() => handleDownloadPdf(a.id)}
                              disabled={downloadingPdfId === a.id}
                            >
                              {downloadingPdfId === a.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <FileDown className="h-4 w-4" />
                              )}
                            </Button>
                            <Link href={faaliyetDuzenleHref(a.id)}>
                              <Button variant="ghost" size="sm" className="text-gray-600 h-8 w-8 p-0" title="Düzenle">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>
                            {(a.verificationStatus ?? (a.isVerified ? "ONAYLANDI" : "IMZA_SURECINDE")) === "IMZA_SURECINDE" && (
                              <Button variant="ghost" size="sm" className="text-blue-600 h-8 w-8 p-0" onClick={() => setUploadModalActivityId(a.id)} title="İmzalı belge yükle">
                                <Upload className="h-4 w-4" />
                              </Button>
                            )}
                            {(a.verificationStatus ?? "") === "ONAY_BEKLIYOR" && (
                              <>
                                <Button variant="ghost" size="sm" className="text-emerald-600 h-8 w-8 p-0" onClick={() => handleVerify(a.id, true)} title="Onayla">
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                {a.signedDocumentUrls?.length ? (
                                  <a href={a.signedDocumentUrls[0]} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center h-8 w-8 text-gray-500 hover:text-gray-700" title="İmzalı belgeyi aç">
                                    <FileCheck className="h-4 w-4" />
                                  </a>
                                ) : null}
                              </>
                            )}
                            {(a.verificationStatus ?? (a.isVerified ? "ONAYLANDI" : "")) === "ONAYLANDI" && (
                              <Button variant="ghost" size="sm" className="text-amber-600 h-8 w-8 p-0" onClick={() => handleVerify(a.id, false)} title="Onayı kaldır">
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" className="text-red-600 h-8 w-8 p-0" onClick={() => handleDelete(a.id, a.title)} title="Sil">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500">Sayfa {page} / {totalPages}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Önceki</Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Sonraki</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* İmzalı belge yükleme modalı */}
      {uploadModalActivityId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !uploadingSigned && setUploadModalActivityId(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900">İmzalı belge yükle</h3>
            <p className="text-sm text-gray-500">
              Taranmış veya fotoğraflanan imzalı belgeleri (PDF veya resim) yükleyin. Yükleme sonrası faaliyet &quot;Onay bekliyor&quot; durumuna geçer.
            </p>
            <input
              type="file"
              accept=".pdf,image/jpeg,image/jpg,image/png,image/gif,image/webp"
              multiple
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700"
              id="signed-doc-upload"
              disabled={uploadingSigned}
            />
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setUploadModalActivityId(null)} disabled={uploadingSigned}>
                İptal
              </Button>
              <Button
                onClick={() => {
                  const input = document.getElementById("signed-doc-upload") as HTMLInputElement
                  handleUploadSignedDocuments(uploadModalActivityId, input?.files)
                }}
                disabled={uploadingSigned}
              >
                {uploadingSigned ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Yükleniyor…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Yükle
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
