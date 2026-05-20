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
  FileDown,
  Layers,
} from "lucide-react"
import { ACTIVITY_MAIN_TYPES, MAIN_TYPE_LABELS } from "@/lib/activity-types-config"

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

/** Birleşik liste satırı — GET /api/ib-dashboard/faaliyet-list */
export interface IBDashboardUnifiedItem {
  source: "event"
  id: string
  title: string
  sortDate: string
  participantCount: number
  verificationStatus: ActivityVerificationStatus
  detailHref: string
  teacherOrOrganizer: string | null
  typeLabel: string
  categoryLabel: string | null
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
  /** Varsayılan: IB Faaliyet Yönetimi */
  title?: string
  /** Varsayılan: Öğrenci faaliyetlerini yönetin... */
  subtitle?: string
  faaliyetEkleHref: string
  studentDetailHref: (studentId: string) => string
  /** Faaliyet düzenleme sihirbazı (activity_events id). Verilmezse /faaliyet-yonetimi/duzenle/[id] kullanılır. */
  faaliyetDuzenleHref?: (activityId: string) => string
  showViewerButton?: boolean
  onViewerClick?: () => void
}

export function IBFaaliyetDashboard({
  title = "IB Faaliyet Yönetimi",
  subtitle = "Öğrenci faaliyetlerini yönetin, doğrulayın ve IB programına hazırlayın",
  faaliyetEkleHref,
  studentDetailHref,
  faaliyetDuzenleHref = (id) => `/faaliyet-yonetimi/duzenle/${id}`,
  showViewerButton = true,
  onViewerClick,
}: IBFaaliyetDashboardProps) {
  const [stats, setStats] = useState<IBDashboardStats | null>(null)
  const [listItems, setListItems] = useState<IBDashboardUnifiedItem[]>([])
  const [students, setStudents] = useState<Array<{ id: string; firstName: string; lastName: string; grade: string }>>([])
  const [loading, setLoading] = useState(true)
  const [loadingList, setLoadingList] = useState(false)
  const [studentFilter, setStudentFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [mainTypeFilter, setMainTypeFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [search, setSearch] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [verifiedFilter, setVerifiedFilter] = useState("all")
  const [verificationStatusFilter, setVerificationStatusFilter] = useState("")
  const [topStudentSearch, setTopStudentSearch] = useState("")
  const [page, setPage] = useState(1)
  const [downloadingPdfKey, setDownloadingPdfKey] = useState<string | null>(null)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [listError, setListError] = useState<string | null>(null)
  const [statsError, setStatsError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/activity-events/stats", { headers: getAuthHeaders() })
      if (res.ok) {
        setStats(await res.json())
        setStatsError(null)
      } else {
        const body = await res.json().catch(() => ({}))
        setStats(null)
        setStatsError(
          (body as { error?: string }).error ||
            (res.status === 403
              ? "İstatistikler için oturum süresi dolmuş veya yetki yok. Çıkış yapıp tekrar giriş yapın."
              : `İstatistikler yüklenemedi (${res.status})`)
        )
      }
    } catch {
      setStats(null)
      setStatsError("İstatistikler yüklenemedi (ağ hatası).")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchActivities = useCallback(async () => {
    setLoadingList(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" })
      if (studentFilter) params.set("studentId", studentFilter)
      if (typeFilter) params.set("type", typeFilter)
      if (mainTypeFilter) params.set("mainType", mainTypeFilter)
      if (categoryFilter) params.set("category", categoryFilter)
      if (search) params.set("search", search)
      if (startDate) params.set("startDate", startDate)
      if (endDate) params.set("endDate", endDate)
      if (verificationStatusFilter) params.set("verificationStatus", verificationStatusFilter)
      const res = await fetch(`/api/ib-dashboard/faaliyet-list?${params}`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setListItems(data.items ?? [])
        setTotalPages(data.pagination?.totalPages ?? 1)
        setTotalCount(data.pagination?.total ?? 0)
        setListError(null)
      } else {
        const body = await res.json().catch(() => ({}))
        setListItems([])
        setTotalPages(1)
        setTotalCount(0)
        setListError(
          (body as { error?: string }).error ||
            (res.status === 403
              ? "Faaliyet listesi için oturum süresi dolmuş veya yetki yok. Çıkış yapıp tekrar giriş yapın."
              : `Liste yüklenemedi (${res.status})`)
        )
      }
    } catch {
      setListItems([])
      setTotalPages(1)
      setTotalCount(0)
      setListError("Liste yüklenemedi (ağ hatası).")
    } finally {
      setLoadingList(false)
    }
  }, [
    page,
    studentFilter,
    typeFilter,
    mainTypeFilter,
    categoryFilter,
    search,
    startDate,
    endDate,
    verificationStatusFilter,
  ])

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

  const handleDownloadPdf = async (item: IBDashboardUnifiedItem) => {
    const key = item.id
    setDownloadingPdfKey(key)
    try {
      const urlPath = `/api/activity-events/${item.id}/pdf`
      const res = await fetch(urlPath, { headers: getAuthHeaders() })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error || "PDF alınamadı")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const disposition = res.headers.get("Content-Disposition")
      const match = disposition?.match(/filename="?([^";]+)"?/)
      const fileName = match?.[1]?.trim() || `faaliyet-${item.title.slice(0, 20)}.pdf`
      const a = document.createElement("a")
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert(e instanceof Error ? e.message : "PDF indirilemedi.")
    } finally {
      setDownloadingPdfKey(null)
    }
  }

  const handleDelete = async (item: IBDashboardUnifiedItem) => {
    const message = `"${item.title}" faaliyetini ve tüm katılımcı kayıtlarını silmek istediğinizden emin misiniz?`
    if (!confirm(message)) return
    try {
      const res = await fetch(`/api/activity-events/${item.id}`, { method: "DELETE", headers: getAuthHeaders() })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j.error || "Silinemedi")
        }
      fetchStats()
      fetchActivities()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Silme işlemi başarısız.")
    }
  }

  const resetFilters = () => {
    setStudentFilter("")
    setTypeFilter("")
    setMainTypeFilter("")
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

  const filteredTopStudents = (stats?.topStudents ?? []).filter((s) => {
    const q = topStudentSearch.trim().toLowerCase()
    if (!q) return true
    return (
      s.fullName.toLowerCase().includes(q) ||
      (s.grade ?? "").toLowerCase().includes(q) ||
      s.tcNumber.includes(q)
    )
  })

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
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
            <p className="mt-1 text-indigo-100">{subtitle}</p>
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

      {(listError || statsError) && (
        <div
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm"
        >
          <p className="font-semibold">Liste veya istatistikler yüklenemedi</p>
          <p className="mt-1 text-amber-900/90">
            Bu durum genelde <strong>oturum süresinin dolması</strong> veya yetki kontrolünden kaynaklanır; faaliyet
            kayıtlarının toplu silindiği anlamına gelmez.
          </p>
          {statsError && <p className="mt-2 text-amber-950">{statsError}</p>}
          {listError && <p className="mt-2 text-amber-950">{listError}</p>}
          <p className="mt-2 text-xs text-amber-900/85">
            Çözüm: Çıkış yapıp tekrar giriş yapın. Gerekirse veritabanında{" "}
            <code className="rounded bg-amber-100/80 px-1 py-0.5 text-[11px]">activity_events</code> satır sayısını
            doğrulayın.
          </p>
        </div>
      )}

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
            <CardDescription>Faaliyet oluşturma modülü ile uyumlu</CardDescription>
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
            {(stats?.topStudents?.length ?? 0) > 0 ? (
              <>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Öğrenci ara (ad, sınıf, TC)..."
                    value={topStudentSearch}
                    onChange={(e) => setTopStudentSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <ul className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {filteredTopStudents.map((s, i) => (
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
                {filteredTopStudents.length === 0 && (
                  <li className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
                    Aramaya uygun öğrenci bulunamadı.
                  </li>
                )}
                </ul>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Users className="h-12 w-12 mb-3 text-gray-300" />
                <p className="text-sm">Henüz katılım verisi yok</p>
                <p className="text-xs mt-1">Faaliyet oluşturma modülü ile kayıt oluşturun</p>
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
          <CardDescription>
            Liste yalnızca yeni faaliyet yönetimi kayıtlarını gösterir. Detaydan katılımcılara inin.
          </CardDescription>
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
              <Label className="text-xs">Ana tür (sertifika)</Label>
              <select
                value={mainTypeFilter}
                onChange={(e) => { setMainTypeFilter(e.target.value); setPage(1) }}
                className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">Tümü</option>
                {ACTIVITY_MAIN_TYPES.map((mt) => (
                  <option key={mt} value={mt}>{MAIN_TYPE_LABELS[mt]}</option>
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
            <CardDescription>
              Toplam {totalCount} faaliyet / grup · Satıra tıklayarak veya &quot;Detay&quot; ile katılımcılara inin
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {loadingList ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : listItems.length === 0 ? (
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
                      <th className="pb-3 font-medium px-2">Başlık</th>
                      <th className="pb-3 font-medium px-2">Kaynak</th>
                      <th className="pb-3 font-medium px-2">Tür</th>
                      <th className="pb-3 font-medium px-2">Öğretmen</th>
                      <th className="pb-3 font-medium px-2">Oluşturulma</th>
                      <th className="pb-3 font-medium px-2">Katılımcı</th>
                      <th className="pb-3 font-medium px-2">Durum</th>
                      <th className="pb-3 font-medium px-2 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listItems.map((row) => (
                      <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="py-3 px-2 font-medium text-gray-900 max-w-[220px]">
                          <Link href={row.detailHref} className="hover:text-indigo-600 hover:underline line-clamp-2">
                            {row.title}
                          </Link>
                        </td>
                        <td className="py-3 px-2">
                          <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-800">
                            <Layers className="h-3 w-3" /> Yeni Faaliyet
                          </span>
                        </td>
                        <td className="py-3 px-2 text-gray-600">
                          <span className="block">{row.typeLabel}</span>
                          {row.categoryLabel && (
                            <span className="text-xs text-gray-400">{row.categoryLabel}</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-gray-600 text-xs max-w-[120px] truncate">
                          {row.teacherOrOrganizer ?? "—"}
                        </td>
                        <td className="py-3 px-2 text-gray-600 whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            {new Date(row.sortDate).toLocaleDateString("tr-TR")}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-gray-700 font-medium">{row.participantCount}</td>
                        <td className="py-3 px-2">
                          {row.verificationStatus === "ONAYLANDI" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                              <CheckCircle className="h-3.5 w-3.5" /> Onaylandı
                            </span>
                          ) : row.verificationStatus === "ONAY_BEKLIYOR" ? (
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
                            <Link href={row.detailHref}>
                              <Button variant="ghost" size="sm" className="text-indigo-600 h-8 px-2" title="Detay ve katılımcılar">
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 h-8 w-8 p-0"
                              title="PDF (tüm katılımcılar / birleşik)"
                              onClick={() => handleDownloadPdf(row)}
                              disabled={downloadingPdfKey === row.id}
                            >
                              {downloadingPdfKey === row.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <FileDown className="h-4 w-4" />
                              )}
                            </Button>
                            <Link href={faaliyetDuzenleHref(row.id)}>
                              <Button variant="ghost" size="sm" className="text-gray-600 h-8 w-8 p-0" title="Düzenle">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 h-8 w-8 p-0"
                              onClick={() => handleDelete(row)}
                              title="Sil"
                            >
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
    </div>
  )
}
