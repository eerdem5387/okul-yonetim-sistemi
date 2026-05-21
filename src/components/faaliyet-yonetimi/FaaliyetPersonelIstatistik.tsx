"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
  Search,
  UserCircle,
} from "lucide-react"
import { STAFF_DEPARTMENT_LABELS } from "@/lib/hr/constants"
import { MAIN_TYPE_LABELS } from "@/lib/activity-types-config"
import type { ActivityMainType } from "@/lib/activity-types-config"
import type { StaffDepartment } from "@prisma/client"
import type { ActivityVerificationStatus } from "@/components/ib-faaliyet-dashboard/IBFaaliyetDashboard"
import { canViewActivityStaffStats, fetchPermissionsMe } from "@/lib/permissions/client"

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
  const h: HeadersInit = { "Content-Type": "application/json" }
  if (token) (h as Record<string, string>)["Authorization"] = `Bearer ${token}`
  return h
}

type StaffSummaryRow = {
  staffId: string
  fullName: string
  department: string
  departmentLabel: string
  isActive?: boolean
  activityCount: number
  participantCount: number
  thisYearCount: number
  lastCreatedAt: string | null
  byMainType: Record<string, number>
  distinctCreators?: number
}

type ActivityRow = {
  id: string
  title: string
  mainTypeLabel: string
  subtype: string | null
  participantCount: number
  verificationStatus: ActivityVerificationStatus
  createdAt: string
  startDate: string
  endDate: string
  organizerName: string
  teacherName: string
  createdByName: string | null
  detailHref: string
}

type Props = {
  backHref: string
  detailHref?: (activityId: string) => string
  title?: string
  subtitle?: string
}

function statusBadge(status: ActivityVerificationStatus) {
  if (status === "ONAYLANDI") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
        <CheckCircle className="h-3 w-3" /> Onaylandı
      </span>
    )
  }
  if (status === "ONAY_BEKLIYOR") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
        <Clock className="h-3 w-3" /> Onay bekliyor
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
      <FileText className="h-3 w-3" /> İmza sürecinde
    </span>
  )
}

export function FaaliyetPersonelIstatistik({
  backHref,
  detailHref = (id) => `/faaliyet-yonetimi/${id}`,
  title = "Personel Faaliyet İstatistikleri",
  subtitle = "Hangi personelin kaç faaliyet girdiğini ve faaliyet detaylarını inceleyin",
}: Props) {
  const searchParams = useSearchParams()
  const initialStaffId = searchParams.get("staffId")

  const [loading, setLoading] = useState(true)
  const [loadingActivities, setLoadingActivities] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<{
    totalActivities: number
    staffWithEntries: number
    totalParticipants: number
    thisYearActivities: number
  } | null>(null)
  const [staffList, setStaffList] = useState<StaffSummaryRow[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<StaffSummaryRow | null>(null)
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [activityPage, setActivityPage] = useState(1)
  const [activityTotalPages, setActivityTotalPages] = useState(1)
  const [accessAllowed, setAccessAllowed] = useState<boolean | null>(null)

  const [search, setSearch] = useState("")
  const [department, setDepartment] = useState("")
  const [year, setYear] = useState("")
  const [availableYears, setAvailableYears] = useState<number[]>([])

  const departmentOptions = useMemo(
    () =>
      Object.entries(STAFF_DEPARTMENT_LABELS).filter(([d]) => d !== "SUPER_ADMIN") as [
        StaffDepartment,
        string,
      ][],
    []
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const me = await fetchPermissionsMe()
      if (cancelled) return
      setAccessAllowed(canViewActivityStaffStats(me))
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const fetchStaffList = useCallback(async () => {
    if (!accessAllowed) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set("search", search.trim())
      if (department) params.set("department", department)
      if (year) params.set("year", year)
      const res = await fetch(`/api/ib-dashboard/personel-istatistik?${params}`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error || `Yüklenemedi (${res.status})`)
      }
      const data = await res.json()
      setSummary(data.summary ?? null)
      setStaffList(data.staff ?? [])
      if (Array.isArray(data.availableYears)) setAvailableYears(data.availableYears)
      if (initialStaffId && data.staff?.some((s: StaffSummaryRow) => s.staffId === initialStaffId)) {
        setSelectedStaffId(initialStaffId)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Veri yüklenemedi")
      setStaffList([])
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [search, department, year, initialStaffId, accessAllowed])

  const fetchStaffActivities = useCallback(
    async (staffId: string, page: number) => {
      if (!accessAllowed) return
      setLoadingActivities(true)
      try {
        const params = new URLSearchParams({
          staffId,
          page: String(page),
          limit: "15",
        })
        if (year) params.set("year", year)
        const res = await fetch(`/api/ib-dashboard/personel-istatistik?${params}`, {
          headers: getAuthHeaders(),
          cache: "no-store",
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error((body as { error?: string }).error || "Detaylar yüklenemedi")
        }
        const data = await res.json()
        setSelectedStaff(data.staff ?? null)
        setActivities(data.activities ?? [])
        setActivityTotalPages(data.pagination?.totalPages ?? 1)
      } catch (e) {
        setActivities([])
        setError(e instanceof Error ? e.message : "Detaylar yüklenemedi")
      } finally {
        setLoadingActivities(false)
      }
    },
    [year, accessAllowed]
  )

  useEffect(() => {
    if (accessAllowed === true) fetchStaffList()
    if (accessAllowed === false) setLoading(false)
  }, [fetchStaffList, accessAllowed])

  useEffect(() => {
    if (!selectedStaffId) {
      setSelectedStaff(null)
      setActivities([])
      return
    }
    fetchStaffActivities(selectedStaffId, activityPage)
  }, [selectedStaffId, activityPage, fetchStaffActivities])

  const handleSelectStaff = (row: StaffSummaryRow) => {
    setSelectedStaffId(row.staffId)
    setSelectedStaff(row)
    setActivityPage(1)
  }

  if (accessAllowed === null) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (accessAllowed === false) {
    return (
      <div className="space-y-4 max-w-lg">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Faaliyet yönetimine dön
        </Link>
        <Card>
          <CardContent className="pt-6">
            <p className="font-medium text-gray-900">Erişim reddedildi</p>
            <p className="text-sm text-gray-600 mt-2">
              Personel faaliyet istatistiklerini yalnızca sistem yöneticisinin yetkilendirme
              ekranından <strong>«Personel Faaliyet İstatistikleri → Görüntüle»</strong> iznini
              verdiği kullanıcılar görebilir. Faaliyet yönetimi erişiminiz bu özelliği otomatik
              açmaz.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Faaliyet yönetimine dön
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-medium text-gray-500 uppercase">Toplam faaliyet</p>
              <p className="mt-1 text-2xl font-bold">{summary.totalActivities}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-medium text-gray-500 uppercase">Kayıt giren personel</p>
              <p className="mt-1 text-2xl font-bold">{summary.staffWithEntries}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-medium text-gray-500 uppercase">Toplam katılımcı</p>
              <p className="mt-1 text-2xl font-bold">{summary.totalParticipants}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-medium text-gray-500 uppercase">Bu yıl (tümü)</p>
              <p className="mt-1 text-2xl font-bold">{summary.thisYearActivities}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4" />
              Filtreler
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label className="text-xs">Personel ara</Label>
              <Input
                className="mt-1.5"
                placeholder="Ad, soyad..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Departman</Label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">Tümü</option>
                {departmentOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Oluşturulma yılı</Label>
              <select
                value={year}
                onChange={(e) => {
                  setYear(e.target.value)
                  setActivityPage(1)
                }}
                className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">Tüm yıllar</option>
                {availableYears.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserCircle className="h-5 w-5 text-indigo-600" />
              Personel sıralaması
            </CardTitle>
            <CardDescription>Sorumlu öğretmene göre faaliyet sayısı</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              </div>
            ) : staffList.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">Kayıt bulunamadı.</p>
            ) : (
              <ul className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                {staffList.map((s, i) => (
                  <li key={s.staffId}>
                    <button
                      type="button"
                      onClick={() => handleSelectStaff(s)}
                      className={`w-full text-left rounded-xl border px-3 py-3 transition-colors ${
                        selectedStaffId === s.staffId
                          ? "border-indigo-300 bg-indigo-50"
                          : "border-gray-200 hover:border-indigo-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-indigo-600 mr-2">#{i + 1}</span>
                          <span className="font-semibold text-gray-900">{s.fullName}</span>
                          <p className="text-xs text-gray-500 mt-0.5">{s.departmentLabel}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-indigo-100 px-2.5 py-0.5 text-sm font-bold text-indigo-700">
                          {s.activityCount}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {s.participantCount} katılımcı · Bu yıl: {s.thisYearCount}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
              {selectedStaff ? selectedStaff.fullName : "Faaliyet detayları"}
            </CardTitle>
            <CardDescription>
              {selectedStaff
                ? `${selectedStaff.activityCount} faaliyet · Son kayıt: ${
                    selectedStaff.lastCreatedAt
                      ? new Date(selectedStaff.lastCreatedAt).toLocaleDateString("tr-TR")
                      : "—"
                  }`
                : "Soldan bir personel seçin"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedStaffId ? (
              <p className="text-sm text-gray-500 text-center py-12">
                Detayları görmek için soldan personel seçin.
              </p>
            ) : loadingActivities && activities.length === 0 ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              </div>
            ) : activities.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-12">Bu filtreye uygun faaliyet yok.</p>
            ) : (
              <>
                {selectedStaff && Object.keys(selectedStaff.byMainType).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {Object.entries(selectedStaff.byMainType).map(([type, count]) => (
                      <span
                        key={type}
                        className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700"
                      >
                        {MAIN_TYPE_LABELS[type as ActivityMainType] ?? type}: <strong>{count}</strong>
                      </span>
                    ))}
                  </div>
                )}
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="pb-2 px-2 font-medium">Başlık</th>
                        <th className="pb-2 px-2 font-medium">Tür</th>
                        <th className="pb-2 px-2 font-medium">Tarih</th>
                        <th className="pb-2 px-2 font-medium">Kat.</th>
                        <th className="pb-2 px-2 font-medium">Durum</th>
                        <th className="pb-2 px-2 font-medium">Kaydı giren</th>
                        <th className="pb-2 px-2 text-right font-medium" />
                      </tr>
                    </thead>
                    <tbody>
                      {activities.map((a) => (
                        <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50/80">
                          <td className="py-2.5 px-2 font-medium text-gray-900 max-w-[200px]">
                            <Link
                              href={detailHref(a.id)}
                              className="hover:text-indigo-600 line-clamp-2"
                            >
                              {a.title}
                            </Link>
                          </td>
                          <td className="py-2.5 px-2 text-gray-600 text-xs">
                            {a.mainTypeLabel}
                            {a.subtype ? (
                              <span className="block text-gray-400">{a.subtype}</span>
                            ) : null}
                          </td>
                          <td className="py-2.5 px-2 text-gray-600 whitespace-nowrap text-xs">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(a.createdAt).toLocaleDateString("tr-TR")}
                            </span>
                          </td>
                          <td className="py-2.5 px-2">{a.participantCount}</td>
                          <td className="py-2.5 px-2">{statusBadge(a.verificationStatus)}</td>
                          <td className="py-2.5 px-2 text-xs text-gray-600 max-w-[100px] truncate">
                            {a.createdByName ?? "—"}
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <Link href={detailHref(a.id)}>
                              <Button variant="ghost" size="sm" className="h-8 px-2">
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {activityTotalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-3 border-t">
                    <p className="text-sm text-gray-500">
                      Sayfa {activityPage} / {activityTotalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={activityPage <= 1}
                        onClick={() => setActivityPage((p) => p - 1)}
                      >
                        Önceki
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={activityPage >= activityTotalPages}
                        onClick={() => setActivityPage((p) => p + 1)}
                      >
                        Sonraki
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
