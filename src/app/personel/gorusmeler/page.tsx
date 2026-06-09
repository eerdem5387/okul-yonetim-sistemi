"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { StaffDepartment, StaffRetentionOutcome } from "@prisma/client"
import {
  Download,
  Eye,
  Loader2,
  MessageSquare,
  Plus,
  Search,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { HrStatCard } from "@/components/hr/HrStatCard"
import { RetentionOutcomeBadge } from "@/components/hr/RetentionOutcomeBadge"
import { RetentionMeetingForm } from "@/components/hr/RetentionMeetingForm"
import { departmentLabel, formatDateTime, getAuthHeaders } from "@/components/hr/hr-utils"
import { RETENTION_OUTCOME_LABELS } from "@/lib/hr/retention"
import { canViewHrRetention, fetchPermissionsMe } from "@/lib/permissions/client"

type OverviewRow = {
  staff: {
    id: string
    firstName: string
    lastName: string
    department: StaffDepartment
    subject: string | null
  }
  cycle: {
    currentOutcome: StaffRetentionOutcome | null
    lastMeetingAt: string | null
  } | null
  lastMeeting: {
    meetingAt: string
    notes: string | null
    conductedBy: { firstName: string; lastName: string } | null
  } | null
  hasMeeting: boolean
}

type OverviewData = {
  targetYear: string | null
  rows: OverviewRow[]
  stats: {
    total: number
    willContinue: number
    uncertain: number
    willNotContinue: number
    noMeeting: number
  }
}

const DEPARTMENTS: StaffDepartment[] = [
  "OGRETMEN",
  "OGRENCI_ISLERI",
  "MUDUR",
  "MUDUR_YARDIMCISI",
  "REHBERLIK",
  "BAS_REHBERLIK",
  "MUHASEBE",
  "GUZEL_SANATLAR",
  "SPOR",
  "KUTUPHANE",
  "TEKNIK",
  "TEMIZLIK",
  "GUVENLIK",
  "DIGER",
]

export default function PersonelGorusmelerPage() {
  const router = useRouter()
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [department, setDepartment] = useState("")
  const [outcome, setOutcome] = useState("")
  const [modalStaffId, setModalStaffId] = useState<string | null>(null)

  useEffect(() => {
    fetchPermissionsMe().then((perms) => {
      const ok = canViewHrRetention(perms)
      setAllowed(ok)
      if (!ok) router.replace("/personel")
    })
  }, [router])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set("search", search.trim())
      if (department) params.set("department", department)
      if (outcome) params.set("outcome", outcome)
      const res = await fetch(`/api/hr/retention/cycles?${params}`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      })
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [search, department, outcome])

  useEffect(() => {
    if (allowed) void load()
  }, [allowed, load])

  const handleExport = async () => {
    const params = new URLSearchParams()
    if (search.trim()) params.set("search", search.trim())
    if (department) params.set("department", department)
    if (outcome) params.set("outcome", outcome)
    const res = await fetch(`/api/hr/retention/export?${params}`, {
      headers: getAuthHeaders(),
    })
    if (!res.ok) {
      alert("Dışa aktarma başarısız")
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "personel-gorusmeleri.xlsx"
    a.click()
    URL.revokeObjectURL(url)
  }

  if (allowed === null || (allowed && loading && !data)) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!allowed) return null

  return (
    <div className="px-4 py-6 sm:px-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Personel Görüşmeleri</h1>
          <p className="mt-1 text-sm text-gray-600">
            Bir sonraki akademik yıl için personel devam görüşmelerini yönetin.
            {data?.targetYear ? ` Hedef yıl: ${data.targetYear}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-1.5 h-4 w-4" />
            Excel
          </Button>
        </div>
      </div>

      {data && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <HrStatCard label="Toplam Personel" value={data.stats.total} tone="blue" />
          <HrStatCard label="Devam Edecek" value={data.stats.willContinue} tone="emerald" />
          <HrStatCard label="Belirsiz" value={data.stats.uncertain} tone="amber" />
          <HrStatCard label="Devam Etmeyecek" value={data.stats.willNotContinue} tone="rose" />
          <HrStatCard label="Görüşme Bekliyor" value={data.stats.noMeeting} tone="blue" />
        </div>
      )}

      <div className="flex flex-wrap gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Ad, soyad veya branş ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="">Tüm departmanlar</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {departmentLabel(d)}
            </option>
          ))}
        </select>
        <select
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="">Tüm sonuçlar</option>
          <option value="NO_MEETING">Görüşme Yapılmadı</option>
          {Object.entries(RETENTION_OUTCOME_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Personel</th>
              <th className="px-4 py-3">Departman</th>
              <th className="px-4 py-3">Son Görüşme</th>
              <th className="px-4 py-3">Sonuç</th>
              <th className="px-4 py-3">Görüşmeyi Yapan</th>
              <th className="px-4 py-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {data?.rows.map((row) => (
              <tr key={row.staff.id} className="border-t border-gray-100 hover:bg-gray-50/80">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {row.staff.firstName} {row.staff.lastName}
                  {row.staff.subject && (
                    <span className="block text-xs font-normal text-gray-500">{row.staff.subject}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">{departmentLabel(row.staff.department)}</td>
                <td className="px-4 py-3 text-gray-600">
                  {row.lastMeeting ? formatDateTime(row.lastMeeting.meetingAt) : "—"}
                </td>
                <td className="px-4 py-3">
                  <RetentionOutcomeBadge outcome={row.cycle?.currentOutcome} />
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {row.lastMeeting?.conductedBy
                    ? `${row.lastMeeting.conductedBy.firstName} ${row.lastMeeting.conductedBy.lastName}`
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Link
                      href={`/personel/${row.staff.id}?tab=retention`}
                      className="inline-flex h-8 items-center rounded-md border border-gray-200 bg-white px-3 text-xs font-medium hover:bg-gray-50"
                    >
                      <Eye className="mr-1 h-3.5 w-3.5" />
                      Detay
                    </Link>
                    <Button size="sm" onClick={() => setModalStaffId(row.staff.id)}>
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Görüşme
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.rows.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-gray-500">Kayıt bulunamadı.</p>
        )}
      </div>

      {modalStaffId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-indigo-600" />
                Görüşme Ekle
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setModalStaffId(null)}>
                Kapat
              </Button>
            </div>
            <RetentionMeetingForm
              staffId={modalStaffId}
              onSuccess={() => {
                setModalStaffId(null)
                void load()
              }}
              onCancel={() => setModalStaffId(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
