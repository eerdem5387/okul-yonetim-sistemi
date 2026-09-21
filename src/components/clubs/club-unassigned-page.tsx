"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Download,
  Loader2,
  Search,
  UserX,
  Users,
  School,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

type GradeRow = {
  grade: string
  gradeLevel: number | null
  unassignedCount: number
  totalStudents: number
  selectedCount: number
}

type UnassignedStudent = {
  id: string
  firstName: string
  lastName: string
  tcNumber: string
  grade: string
  gradeLevel: number | null
}

type Payload = {
  summary: {
    totalStudents: number
    withSelection: number
    withoutSelection: number
    gradeCount: number
  }
  grades: string[]
  byGrade: GradeRow[]
  students: UnassignedStudent[]
}

export function ClubUnassignedPage({
  basePath,
}: {
  basePath: "/clubs" | "/rehberlik/clubs"
}) {
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [exporting, setExporting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/clubs/unassigned", { cache: "no-store" })
      if (!res.ok) throw new Error("Veriler alınamadı")
      const json = (await res.json()) as Payload
      setData(json)
    } catch (e) {
      setData(null)
      setError(e instanceof Error ? e.message : "Veriler alınamadı")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const modalStudents = useMemo(() => {
    if (!data || !selectedGrade) return []
    const q = search.trim().toLocaleLowerCase("tr-TR")
    return data.students.filter((student) => {
      if (student.grade !== selectedGrade) return false
      if (!q) return true
      const full = `${student.firstName} ${student.lastName}`.toLocaleLowerCase("tr-TR")
      return (
        full.includes(q) ||
        student.firstName.toLocaleLowerCase("tr-TR").includes(q) ||
        student.lastName.toLocaleLowerCase("tr-TR").includes(q) ||
        student.tcNumber.includes(q)
      )
    })
  }, [data, selectedGrade, search])

  const selectedGradeRow = useMemo(
    () => data?.byGrade.find((row) => row.grade === selectedGrade) ?? null,
    [data, selectedGrade]
  )

  const closeModal = () => {
    setSelectedGrade(null)
    setSearch("")
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const response = await fetch("/api/clubs/export-by-grade")
      if (!response.ok) throw new Error("Export failed")
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const contentDisposition = response.headers.get("Content-Disposition")
      let filename = "kulup-sinif-verileri.xlsx"
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/)
        if (match) filename = match[1]
      }
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (e) {
      console.error(e)
      alert("Excel indirilirken hata oluştu!")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2">
            <Link href={basePath}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kulüp Yönetimine Dön
              </Button>
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            Seçim Yapmayan Öğrenciler
          </h1>
          <p className="text-gray-600 mt-1 text-xs sm:text-sm">
            Sınıfa tıklayarak seçim yapmayan öğrencileri görüntüleyin
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void handleExport()} disabled={exporting}>
            {exporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Excel İndir
          </Button>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            Yenile
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Yükleniyor...
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-10 text-center text-red-600">{error}</CardContent>
        </Card>
      ) : data ? (
        <>
          <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-gray-500">Toplam öğrenci (5–12)</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{data.summary.totalStudents}</p>
                  </div>
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-gray-500">Seçim yapan</p>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">{data.summary.withSelection}</p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-gray-500">Seçim yapmayan</p>
                    <p className="text-2xl font-bold text-rose-700 mt-1">{data.summary.withoutSelection}</p>
                  </div>
                  <UserX className="h-5 w-5 text-rose-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-gray-500">Eksik sınıf</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{data.summary.gradeCount}</p>
                  </div>
                  <School className="h-5 w-5 text-indigo-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Sınıf bazında özet</CardTitle>
              <CardDescription>Bir sınıfa tıklayınca öğrenci listesi açılır</CardDescription>
            </CardHeader>
            <CardContent>
              {data.byGrade.length === 0 ? (
                <p className="text-sm text-emerald-700 py-4">
                  Tüm öğrencilerin kulüp seçimi tamamlanmış.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {data.byGrade.map((row) => {
                    const pct =
                      row.totalStudents > 0
                        ? Math.round((row.unassignedCount / row.totalStudents) * 100)
                        : 0
                    return (
                      <button
                        key={row.grade}
                        type="button"
                        onClick={() => {
                          setSearch("")
                          setSelectedGrade(row.grade)
                        }}
                        className="rounded-xl border border-gray-200 bg-white p-3 text-left transition hover:border-rose-300 hover:bg-rose-50/60 hover:shadow-sm"
                      >
                        <p className="font-semibold text-gray-900">{row.grade}</p>
                        <p className="mt-1 text-sm text-rose-700">
                          {row.unassignedCount} seçim yapmamış
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {row.selectedCount}/{row.totalStudents} seçim yaptı · %{pct} eksik
                        </p>
                      </button>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}

      <Dialog open={!!selectedGrade} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-2xl w-[min(92vw,42rem)] max-h-[80vh] flex flex-col overflow-hidden p-0">
          <div className="px-6 pt-6 pb-3 border-b border-gray-100">
            <DialogHeader className="mb-0 pr-6">
              <DialogTitle>{selectedGrade} — Seçim yapmayanlar</DialogTitle>
              <DialogDescription>
                {selectedGradeRow
                  ? `${selectedGradeRow.unassignedCount} öğrenci · ${selectedGradeRow.selectedCount}/${selectedGradeRow.totalStudents} seçim yaptı`
                  : `${modalStudents.length} öğrenci`}
              </DialogDescription>
            </DialogHeader>
            <div className="relative mt-4">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ad, soyad veya TC ara"
                className="pl-10"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-3 min-h-0">
            {modalStudents.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-500">
                Bu sınıfta filtreye uyan öğrenci yok.
              </p>
            ) : (
              <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden">
                {modalStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 px-4 py-3 bg-white"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-xs text-gray-500">TC: {student.tcNumber}</p>
                    </div>
                    <p className="text-sm text-gray-600">{student.grade}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
            <Button variant="outline" size="sm" onClick={closeModal}>
              Kapat
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
