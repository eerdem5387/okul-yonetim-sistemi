"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Loader2, ClipboardList } from "lucide-react"
import { getAuthHeaders } from "@/components/hr/hr-utils"
import { useStaffPermissions, checkNavPermission } from "@/hooks/use-staff-permissions"

type Kind = "CLASS" | "STUDY_GROUP" | "CLUB"

type AttendanceRow = {
  id: string
  kind: Kind
  date: string
  lessonName: string
  startTime: string
  endTime: string
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"
  note: string | null
  student?: { firstName: string; lastName: string; grade: string } | null
  teacher?: { firstName: string; lastName: string } | null
  class?: { name: string } | null
  studyGroupSession?: {
    topic: string
    studyGroup?: { name: string; gradeLevel: number } | null
  } | null
  clubSchedule?: { club?: { name: string } | null } | null
}

const STATUS_TR: Record<string, string> = {
  PRESENT: "Geldi",
  ABSENT: "Gelmedi",
  LATE: "Geç",
  EXCUSED: "İzinli",
}

const TABS: Array<{ id: Kind; label: string }> = [
  { id: "CLASS", label: "Ders programı" },
  { id: "STUDY_GROUP", label: "ÖÇG" },
  { id: "CLUB", label: "Kulüp" },
]

function formatDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("tr-TR")
}

export default function DevamsizlikPage() {
  const router = useRouter()
  const permState = useStaffPermissions()
  const [tab, setTab] = useState<Kind>("CLASS")
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().split("T")[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0])
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [rows, setRows] = useState<AttendanceRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const canView = checkNavPermission(permState, "attendance", "view", false)

  useEffect(() => {
    if (!permState.permissionsLoaded) return
    if (permState.isSuperAdmin) return
    if (!canView) {
      router.replace("/")
    }
  }, [permState.permissionsLoaded, permState.isSuperAdmin, canView, router])

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams({
        kind: tab,
        dateFrom,
        dateTo,
      })
      if (statusFilter) params.set("status", statusFilter)
      const res = await fetch(`/api/attendance?${params}`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Yoklamalar alınamadı")
      setRows(Array.isArray(data.attendances) ? data.attendances : [])
    } catch (e) {
      setRows([])
      setError(e instanceof Error ? e.message : "Yüklenemedi")
    } finally {
      setLoading(false)
    }
  }, [tab, dateFrom, dateTo, statusFilter])

  useEffect(() => {
    if (!permState.permissionsLoaded) return
    if (!permState.isSuperAdmin && !canView) return
    void load()
  }, [load, permState.permissionsLoaded, permState.isSuperAdmin, canView])

  const summary = useMemo(() => {
    const c = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0, total: rows.length }
    for (const r of rows) {
      if (r.status in c) c[r.status as keyof typeof c]++
    }
    return c
  }, [rows])

  if (!permState.permissionsLoaded) {
    return (
      <div className="flex justify-center py-20 text-gray-500 gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        Yükleniyor...
      </div>
    )
  }

  if (!permState.isSuperAdmin && !canView) {
    return null
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-violet-700" />
          Devamsızlık
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Ders programı, özel çalışma grupları ve kulüp yoklamalarını ayrı tablolarda izleyin.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button
            key={t.id}
            size="sm"
            variant={tab === t.id ? "default" : "outline"}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtreler</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-end">
          <div>
            <Label className="text-xs">Başlangıç</Label>
            <input
              type="date"
              className="mt-1 block rounded-md border border-gray-200 px-3 py-2 text-sm"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Bitiş</Label>
            <input
              type="date"
              className="mt-1 block rounded-md border border-gray-200 px-3 py-2 text-sm"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Durum</Label>
            <select
              className="mt-1 block rounded-md border border-gray-200 px-3 py-2 text-sm min-w-[140px]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Tümü</option>
              <option value="ABSENT">Gelmedi</option>
              <option value="LATE">Geç</option>
              <option value="EXCUSED">İzinli</option>
              <option value="PRESENT">Geldi</option>
            </select>
          </div>
          <Button size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yenile"}
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3 text-xs text-gray-600">
        <span>Toplam: {summary.total}</span>
        <span>Geldi: {summary.PRESENT}</span>
        <span>Gelmedi: {summary.ABSENT}</span>
        <span>Geç: {summary.LATE}</span>
        <span>İzinli: {summary.EXCUSED}</span>
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {error ? (
            <p className="text-center text-red-600 py-10">{error}</p>
          ) : loading ? (
            <div className="flex justify-center py-16 text-gray-500 gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Yükleniyor...
            </div>
          ) : rows.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-12">Kayıt yok</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Tarih</th>
                    <th className="px-4 py-3 font-semibold">Saat</th>
                    <th className="px-4 py-3 font-semibold">
                      {tab === "CLASS" ? "Ders / Sınıf" : tab === "STUDY_GROUP" ? "Grup / Konu" : "Kulüp"}
                    </th>
                    <th className="px-4 py-3 font-semibold">Öğrenci</th>
                    <th className="px-4 py-3 font-semibold">Öğretmen</th>
                    <th className="px-4 py-3 font-semibold">Durum</th>
                    <th className="px-4 py-3 font-semibold">Not</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((r) => {
                    let context = r.lessonName
                    if (tab === "CLASS") {
                      context = `${r.lessonName}${r.class?.name ? ` · ${r.class.name}` : ""}`
                    } else if (tab === "STUDY_GROUP") {
                      const g = r.studyGroupSession?.studyGroup
                      context = `${g?.name || r.lessonName}${
                        g?.gradeLevel ? ` (${g.gradeLevel}.)` : ""
                      }${r.studyGroupSession?.topic ? ` · ${r.studyGroupSession.topic}` : ""}`
                    } else {
                      context = r.clubSchedule?.club?.name || r.lessonName
                    }
                    return (
                      <tr key={r.id} className="hover:bg-gray-50/80">
                        <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(r.date)}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-gray-600">
                          {r.startTime}–{r.endTime}
                        </td>
                        <td className="px-4 py-2.5 max-w-[220px]">
                          <span className="line-clamp-2">{context}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          {r.student
                            ? `${r.student.firstName} ${r.student.lastName}`
                            : "—"}
                          {r.student?.grade ? (
                            <span className="block text-xs text-gray-500">{r.student.grade}</span>
                          ) : null}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          {r.teacher
                            ? `${r.teacher.firstName} ${r.teacher.lastName}`
                            : "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
                              r.status === "ABSENT"
                                ? "bg-rose-50 text-rose-800"
                                : r.status === "LATE"
                                  ? "bg-amber-50 text-amber-800"
                                  : r.status === "EXCUSED"
                                    ? "bg-sky-50 text-sky-800"
                                    : "bg-emerald-50 text-emerald-800"
                            }`}
                          >
                            {STATUS_TR[r.status] || r.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs max-w-[160px] truncate">
                          {r.note || "—"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
