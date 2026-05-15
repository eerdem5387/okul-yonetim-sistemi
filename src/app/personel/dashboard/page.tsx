"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, Users, CalendarOff, GraduationCap, ClipboardCheck, ShieldAlert } from "lucide-react"
import type { LeaveStatus, LeaveType, StaffDepartment } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { HrStatCard } from "@/components/hr/HrStatCard"
import { departmentLabel, formatDate, getAuthHeaders, isHrAdminClient, leaveTypeLabel } from "@/components/hr/hr-utils"

interface DashboardData {
  totalActiveStaff: number
  onLeaveToday: {
    count: number
    items: Array<{
      id: string
      type: LeaveType
      startDate: string
      endDate: string
      staff: { id: string; firstName: string; lastName: string; department: StaffDepartment }
    }>
  }
  inClassNow: number
  pendingLeaves: Array<{
    id: string
    type: LeaveType
    status: LeaveStatus
    startDate: string
    endDate: string
    reason: string | null
    staff: { id: string; firstName: string; lastName: string; department: StaffDepartment }
  }>
}

export default function HrDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!isHrAdminClient()) {
      router.replace("/personel")
      return
    }
    setAuthChecked(true)
  }, [router])

  useEffect(() => {
    if (!authChecked) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/hr/dashboard", { headers: getAuthHeaders(), cache: "no-store" })
        if (!res.ok) throw new Error("Yüklenemedi")
        const json = (await res.json()) as DashboardData
        if (!cancelled) setData(json)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Hata")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [authChecked])

  if (!authChecked || loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="px-6 py-10 text-center text-rose-600">
        <ShieldAlert className="mx-auto mb-2 h-6 w-6" />
        {error || "Veri yok"}
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">HR Dashboard</h1>
        <p className="text-sm text-gray-600">{formatDate(new Date())}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <HrStatCard
          label="Aktif Personel"
          value={data.totalActiveStaff}
          icon={Users}
          tone="blue"
        />
        <HrStatCard
          label="Bugün İzinli"
          value={data.onLeaveToday.count}
          icon={CalendarOff}
          tone="amber"
          hint="Onaylanmış izinler"
        />
        <HrStatCard
          label="Şu An Derste"
          value={data.inClassNow}
          icon={GraduationCap}
          tone="emerald"
          hint="Aktif ders programına göre"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <header className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <CalendarOff className="h-4 w-4 text-amber-600" />
                Bugün İzinli Olanlar
              </h2>
              <p className="text-xs text-gray-500">{data.onLeaveToday.count} personel</p>
            </div>
          </header>
          {data.onLeaveToday.items.length === 0 ? (
            <p className="text-sm text-gray-500">Bugün izinli personel yok.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.onLeaveToday.items.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 py-2">
                  <Link
                    href={`/personel/${l.staff.id}`}
                    className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900 hover:text-blue-700"
                  >
                    {l.staff.firstName} {l.staff.lastName}
                    <span className="ml-2 text-xs text-gray-500">
                      {departmentLabel(l.staff.department)}
                    </span>
                  </Link>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    {leaveTypeLabel(l.type)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <header className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <ClipboardCheck className="h-4 w-4 text-blue-600" />
                Bekleyen İzin Talepleri
              </h2>
              <p className="text-xs text-gray-500">{data.pendingLeaves.length} talep</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push("/personel/izinler")}>
              Tümü
            </Button>
          </header>
          {data.pendingLeaves.length === 0 ? (
            <p className="text-sm text-gray-500">Bekleyen talep yok.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.pendingLeaves.map((l) => (
                <li key={l.id} className="py-2">
                  <Link
                    href="/personel/izinler"
                    className="block rounded-md px-2 py-1 hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-gray-900">
                        {l.staff.firstName} {l.staff.lastName}
                      </span>
                      <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                        {leaveTypeLabel(l.type)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {formatDate(l.startDate)} – {formatDate(l.endDate)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
