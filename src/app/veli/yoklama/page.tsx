"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import {
  StudentAttendancePanel,
  type StudentAttendanceRecord,
} from "@/components/students/student-attendance-panel"
import { getAuthHeaders } from "@/components/hr/hr-utils"

export default function VeliYoklamaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [attendances, setAttendances] = useState<StudentAttendanceRecord[]>([])
  const [studentName, setStudentName] = useState("")
  const [selectedDate, setSelectedDate] = useState("")

  useEffect(() => {
    if (typeof window === "undefined") return
    const role = localStorage.getItem("auth_role")
    const parentId = localStorage.getItem("parent_id")
    const savedStudentName = localStorage.getItem("student_name")

    if (role !== "parent" || !parentId) {
      router.push("/veli-login")
      return
    }

    setStudentName(savedStudentName || "Öğrenci")
    void fetchAttendances(parentId)
  }, [router])

  const fetchAttendances = async (parentId: string, date?: string) => {
    try {
      const studentsResponse = await fetch(
        `/api/parents/my-students?parentId=${parentId}`
      )
      if (!studentsResponse.ok) return
      const studentsData = await studentsResponse.json()
      const student = studentsData.students?.[0]
      if (!student) return

      let url = `/api/attendance?studentId=${student.id}`
      if (date) url += `&date=${date}`

      const attendanceResponse = await fetch(url, {
        headers: getAuthHeaders(),
        cache: "no-store",
      })
      if (attendanceResponse.ok) {
        const attendanceData = await attendanceResponse.json()
        setAttendances(
          Array.isArray(attendanceData.attendances)
            ? attendanceData.attendances
            : []
        )
      }
    } catch (error) {
      console.error("Error fetching attendances:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDateFilter = (date: string) => {
    setSelectedDate(date)
    const parentId = localStorage.getItem("parent_id")
    if (parentId) {
      setLoading(true)
      void fetchAttendances(parentId, date || undefined)
    }
  }

  const stats = useMemo(() => {
    const c = {
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      EXCUSED: 0,
      total: attendances.length,
    }
    for (const a of attendances) {
      if (a.status in c) c[a.status as keyof typeof c]++
    }
    const byKind = {
      CLASS: { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0, total: 0, rate: null as number | null },
      STUDY_GROUP: { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0, total: 0, rate: null as number | null },
      CLUB: { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0, total: 0, rate: null as number | null },
    }
    for (const a of attendances) {
      const kind =
        a.kind === "STUDY_GROUP" || a.kind === "CLUB" ? a.kind : "CLASS"
      byKind[kind].total++
      if (a.status === "PRESENT") byKind[kind].PRESENT++
      else if (a.status === "ABSENT") byKind[kind].ABSENT++
      else if (a.status === "LATE") byKind[kind].LATE++
      else if (a.status === "EXCUSED") byKind[kind].EXCUSED++
    }
    for (const k of Object.keys(byKind) as Array<keyof typeof byKind>) {
      byKind[k].rate =
        byKind[k].total > 0
          ? Math.round((byKind[k].PRESENT / byKind[k].total) * 100)
          : null
    }
    return {
      ...c,
      rate: c.total > 0 ? Math.round((c.PRESENT / c.total) * 100) : 100,
      byKind,
    }
  }, [attendances])

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Yükleniyor...
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Yoklama</h1>
        <p className="mt-1 text-sm text-gray-600">
          {studentName} — ders, ÖÇG ve kulüp yoklamaları
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtre</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="veli-att-date" className="text-xs">
            Tarih (opsiyonel)
          </Label>
          <input
            id="veli-att-date"
            type="date"
            className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm sm:max-w-xs"
            value={selectedDate}
            onChange={(e) => handleDateFilter(e.target.value)}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Devam</p>
            <p className="text-2xl font-bold text-emerald-700">%{stats.rate}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Gelmedi</p>
            <p className="text-2xl font-bold text-rose-700">{stats.ABSENT}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Geç</p>
            <p className="text-2xl font-bold text-amber-700">{stats.LATE}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">İzinli</p>
            <p className="text-2xl font-bold text-sky-700">{stats.EXCUSED}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Kayıtlar</CardTitle>
        </CardHeader>
        <CardContent>
          <StudentAttendancePanel
            attendances={attendances}
            byKind={stats.byKind}
            overallRate={stats.rate}
            presentCount={stats.PRESENT}
            totalCount={stats.total}
            emptyText="Henüz yoklama kaydı bulunmuyor"
          />
        </CardContent>
      </Card>
    </div>
  )
}
