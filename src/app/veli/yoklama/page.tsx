"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Loader2 } from "lucide-react"
import {
  StudentAttendancePanel,
  type AttendanceByKind,
  type StudentAttendanceRecord,
} from "@/components/students/student-attendance-panel"

type Period = "30days" | "thisMonth" | "all"

export default function VeliYoklamaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [studentName, setStudentName] = useState("")
  const [period, setPeriod] = useState<Period>("30days")
  const [selectedDate, setSelectedDate] = useState("")
  const [attendances, setAttendances] = useState<StudentAttendanceRecord[]>([])
  const [byKind, setByKind] = useState<AttendanceByKind | null>(null)
  const [overallRate, setOverallRate] = useState(100)
  const [presentCount, setPresentCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [absentCount, setAbsentCount] = useState(0)
  const [lateCount, setLateCount] = useState(0)
  const [excusedCount, setExcusedCount] = useState(0)

  const load = useCallback(async (studentId: string, p: Period) => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(
        `/api/students/${studentId}/dashboard?period=${p}`,
        { cache: "no-store" }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Yoklamalar alınamadı")

      const student = data.student
      if (student) {
        setStudentName(`${student.firstName} ${student.lastName}`)
      }
      setAttendances(
        Array.isArray(data.recentData?.attendances)
          ? data.recentData.attendances
          : []
      )
      setByKind(data.statistics?.attendanceByKind ?? null)
      setOverallRate(data.statistics?.attendanceRate ?? 100)
      setPresentCount(data.statistics?.presentCount ?? 0)
      setTotalCount(data.statistics?.totalAttendances ?? 0)
      setAbsentCount(data.statistics?.absentCount ?? 0)
      setLateCount(data.statistics?.lateCount ?? 0)
      setExcusedCount(data.statistics?.excusedCount ?? 0)
    } catch (e) {
      setAttendances([])
      setError(e instanceof Error ? e.message : "Yüklenemedi")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const role = localStorage.getItem("auth_role")
    const studentId = localStorage.getItem("student_id")
    const savedName = localStorage.getItem("student_name")

    if (role !== "parent" || !studentId) {
      router.push("/veli-login")
      return
    }

    if (savedName) setStudentName(savedName)
    void load(studentId, period)
  }, [router, period, load])

  const visibleAttendances = useMemo(() => {
    if (!selectedDate) return attendances
    return attendances.filter((a) => {
      const d = typeof a.date === "string" ? a.date.slice(0, 10) : ""
      // ISO veya local date karşılaştırması
      if (d === selectedDate) return true
      try {
        const local = new Date(a.date)
        const y = local.getFullYear()
        const m = String(local.getMonth() + 1).padStart(2, "0")
        const day = String(local.getDate()).padStart(2, "0")
        return `${y}-${m}-${day}` === selectedDate
      } catch {
        return false
      }
    })
  }, [attendances, selectedDate])

  const filteredStats = useMemo(() => {
    if (!selectedDate) {
      return {
        rate: overallRate,
        present: presentCount,
        total: totalCount,
        absent: absentCount,
        late: lateCount,
        excused: excusedCount,
        byKind,
      }
    }
    const c = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0, total: visibleAttendances.length }
    const kindMap: AttendanceByKind = {
      CLASS: { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0, total: 0, rate: null },
      STUDY_GROUP: { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0, total: 0, rate: null },
      CLUB: { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0, total: 0, rate: null },
    }
    for (const a of visibleAttendances) {
      const st = a.status as keyof typeof c
      if (st in c && st !== "total") c[st]++
      const kind =
        a.kind === "STUDY_GROUP" || a.kind === "CLUB" ? a.kind : "CLASS"
      const bucket = kindMap[kind]!
      bucket.total++
      if (a.status === "PRESENT") bucket.PRESENT++
      else if (a.status === "ABSENT") bucket.ABSENT++
      else if (a.status === "LATE") bucket.LATE++
      else if (a.status === "EXCUSED") bucket.EXCUSED++
    }
    for (const k of ["CLASS", "STUDY_GROUP", "CLUB"] as const) {
      const b = kindMap[k]!
      b.rate = b.total > 0 ? Math.round((b.PRESENT / b.total) * 100) : null
    }
    return {
      rate: c.total > 0 ? Math.round((c.PRESENT / c.total) * 100) : 100,
      present: c.PRESENT,
      total: c.total,
      absent: c.ABSENT,
      late: c.LATE,
      excused: c.EXCUSED,
      byKind: kindMap,
    }
  }, [
    selectedDate,
    visibleAttendances,
    overallRate,
    presentCount,
    totalCount,
    absentCount,
    lateCount,
    excusedCount,
    byKind,
  ])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 px-4 py-5 text-white sm:px-6">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/veli/panel"
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-white/90 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Panele dön
          </Link>
          <h1 className="text-2xl font-semibold">Yoklama</h1>
          <p className="mt-1 text-sm text-white/85">
            {studentName || "Öğrenci"} — ders, ÖÇG ve kulüp
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filtreler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: "30days" as const, label: "Son 30 gün" },
                  { id: "thisMonth" as const, label: "Bu ay" },
                  { id: "all" as const, label: "Tümü" },
                ] as const
              ).map((p) => (
                <Button
                  key={p.id}
                  type="button"
                  size="sm"
                  variant={period === p.id ? "default" : "outline"}
                  onClick={() => {
                    setSelectedDate("")
                    setPeriod(p.id)
                  }}
                >
                  {p.label}
                </Button>
              ))}
            </div>
            <div>
              <Label htmlFor="veli-att-date" className="text-xs">
                Belirli bir gün (liste içinde)
              </Label>
              <input
                id="veli-att-date"
                type="date"
                className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm sm:max-w-xs"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center gap-2 py-16 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Yükleniyor...
          </div>
        ) : error ? (
          <p className="py-10 text-center text-rose-600">{error}</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500">Devam</p>
                  <p className="text-2xl font-bold text-emerald-700">
                    %{filteredStats.rate}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500">Gelmedi</p>
                  <p className="text-2xl font-bold text-rose-700">
                    {filteredStats.absent}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500">Geç</p>
                  <p className="text-2xl font-bold text-amber-700">
                    {filteredStats.late}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500">İzinli</p>
                  <p className="text-2xl font-bold text-sky-700">
                    {filteredStats.excused}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Kayıtlar</CardTitle>
              </CardHeader>
              <CardContent>
                <StudentAttendancePanel
                  attendances={visibleAttendances}
                  byKind={filteredStats.byKind}
                  overallRate={filteredStats.rate}
                  presentCount={filteredStats.present}
                  totalCount={filteredStats.total}
                  emptyText="Bu dönemde yoklama kaydı yok"
                />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
