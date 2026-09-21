"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Loader2,
  Search,
  UserX,
  Users,
  School,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
  const [gradeFilter, setGradeFilter] = useState("all")
  const [search, setSearch] = useState("")

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

  const filteredStudents = useMemo(() => {
    if (!data) return []
    const q = search.trim().toLocaleLowerCase("tr-TR")
    return data.students.filter((student) => {
      const matchesGrade = gradeFilter === "all" || student.grade === gradeFilter
      if (!matchesGrade) return false
      if (!q) return true
      const full = `${student.firstName} ${student.lastName}`.toLocaleLowerCase("tr-TR")
      return (
        full.includes(q) ||
        student.firstName.toLocaleLowerCase("tr-TR").includes(q) ||
        student.lastName.toLocaleLowerCase("tr-TR").includes(q) ||
        student.tcNumber.includes(q) ||
        student.grade.toLocaleLowerCase("tr-TR").includes(q)
      )
    })
  }, [data, gradeFilter, search])

  const grouped = useMemo(() => {
    const map = new Map<string, UnassignedStudent[]>()
    for (const student of filteredStudents) {
      const list = map.get(student.grade) ?? []
      list.push(student)
      map.set(student.grade, list)
    }
    return [...map.entries()].sort((a, b) => {
      const rowA = data?.byGrade.find((g) => g.grade === a[0])
      const rowB = data?.byGrade.find((g) => g.grade === b[0])
      const la = rowA?.gradeLevel
      const lb = rowB?.gradeLevel
      if (la != null && lb != null && la !== lb) return la - lb
      return a[0].localeCompare(b[0], "tr")
    })
  }, [filteredStudents, data?.byGrade])

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
            Kulüp seçimi yapmamış öğrencileri sınıf bazında inceleyin
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          Yenile
        </Button>
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
              <CardDescription>
                Bir sınıfa tıklayınca aşağıdaki liste yalnızca o sınıfı gösterir
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.byGrade.length === 0 ? (
                <p className="text-sm text-emerald-700 py-4">
                  Tüm öğrencilerin kulüp seçimi tamamlanmış.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {data.byGrade.map((row) => {
                    const active = gradeFilter === row.grade
                    const pct =
                      row.totalStudents > 0
                        ? Math.round((row.unassignedCount / row.totalStudents) * 100)
                        : 0
                    return (
                      <button
                        key={row.grade}
                        type="button"
                        onClick={() => setGradeFilter(active ? "all" : row.grade)}
                        className={`rounded-xl border p-3 text-left transition ${
                          active
                            ? "border-rose-400 bg-rose-50 shadow-sm"
                            : "border-gray-200 bg-white hover:border-rose-200"
                        }`}
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

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Öğrenci listesi</CardTitle>
              <CardDescription>
                {gradeFilter === "all" ? "Tüm sınıflar" : gradeFilter} · {filteredStudents.length}{" "}
                öğrenci
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-[200px_1fr]">
                <div>
                  <Label className="text-xs uppercase tracking-wide text-gray-500">Sınıf</Label>
                  <select
                    value={gradeFilter}
                    onChange={(e) => setGradeFilter(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700"
                  >
                    <option value="all">Tüm sınıflar</option>
                    {(data.grades.length ? data.grades : data.byGrade.map((g) => g.grade)).map(
                      (grade) => (
                        <option key={grade} value={grade}>
                          {grade}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wide text-gray-500">Ara</Label>
                  <div className="mt-2 relative">
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Ad, soyad, TC veya sınıf"
                      className="pl-10"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>

              {filteredStudents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-500">
                  Bu filtreye uyan seçim yapmayan öğrenci yok.
                </div>
              ) : (
                <div className="space-y-4">
                  {grouped.map(([grade, students]) => (
                    <div key={grade} className="rounded-2xl border border-gray-100 overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between gap-2">
                        <p className="font-semibold text-gray-900">{grade}</p>
                        <span className="text-xs font-medium text-rose-700 bg-rose-50 px-2 py-1 rounded-full">
                          {students.length} öğrenci
                        </span>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {students.map((student) => (
                          <div
                            key={student.id}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 px-4 py-3"
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
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
