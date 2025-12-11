"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ToastContainer, useToast } from "@/components/ui/toast"
import {
  Loader2,
  BookOpen,
  TrendingUp,
  ChevronRight,
} from "lucide-react"

interface AcademicYear {
  id: string
  name: string
  isActive: boolean
}

interface Subject {
  id: string
  name: string
  grade: number
  section: string | null
  units: Array<{
    id: string
    name: string
    topics: Array<{
      id: string
      name: string
      plannedStartDate: string | null
      plannedEndDate: string | null
      progress: Array<{
        id: string
        status: string
        actualEndDate: string | null
        markedAt: string | null
      }>
    }>
  }>
}

export default function IlerlemePage() {
  const { toasts, error, removeToast } = useToast()
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedYearId, setSelectedYearId] = useState<string>("")
  const [selectedGrade, setSelectedGrade] = useState<string>("")
  const [selectedSection, setSelectedSection] = useState<string>("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAcademicYears()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selectedYearId) {
      fetchSubjects()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYearId])

  const fetchAcademicYears = async () => {
    try {
      const response = await fetch("/api/neredeyiz/academic-years")
      if (response.ok) {
        const data = await response.json()
        setAcademicYears(data)
        const active = data.find((year: AcademicYear) => year.isActive)
        if (active) {
          setSelectedYearId(active.id)
        } else if (data.length > 0) {
          setSelectedYearId(data[0].id)
        }
      }
    } catch (err) {
      console.error("Error fetching academic years:", err)
      error("Akademik yıllar yüklenirken hata oluştu!")
    } finally {
      setLoading(false)
    }
  }

  const fetchSubjects = async () => {
    if (!selectedYearId) return

    try {
      let url = `/api/neredeyiz/subjects?academicYearId=${selectedYearId}`
      if (selectedGrade) {
        url += `&grade=${selectedGrade}`
      }
      if (selectedSection) {
        url += `&section=${selectedSection}`
      }
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setSubjects(data)
      }
    } catch (err) {
      console.error("Error fetching subjects:", err)
      error("Dersler yüklenirken hata oluştu!")
    }
  }

  if (loading) {
    return (
      <div className="p-3 sm:p-4 md:p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 relative">
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center shadow-lg">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
              İlerleme Takibi
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              Konuların tamamlanma durumunu işaretleyin
            </p>
          </div>
        </div>
      </div>

      {/* Filtreler */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:px-6">
            <CardTitle className="text-sm sm:text-base">Akademik Yıl</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
            <select
              value={selectedYearId}
              onChange={(e) => {
                setSelectedYearId(e.target.value)
              }}
              className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm focus:ring-2 focus:ring-blue-500"
            >
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name} {year.isActive && "(Aktif)"}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:px-6">
            <CardTitle className="text-sm sm:text-base">Sınıf</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
            <select
              value={selectedGrade}
              onChange={(e) => {
                setSelectedGrade(e.target.value)
              }}
              className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tüm Sınıflar</option>
              {[5, 6, 7, 8, 9, 10, 11, 12].map((grade) => (
                <option key={grade} value={grade}>
                  {grade}. Sınıf
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:px-6">
            <CardTitle className="text-sm sm:text-base">Şube</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
            <select
              value={selectedSection}
              onChange={(e) => {
                setSelectedSection(e.target.value)
              }}
              className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tüm Şubeler</option>
              {Array.from(
                new Set(
                  subjects
                    .map((s) => s.section)
                    .filter((s): s is string => s !== null && s !== "")
                )
              )
                .sort()
                .map((section) => (
                  <option key={section} value={section}>
                    {section} Şubesi
                  </option>
                ))}
            </select>
          </CardContent>
        </Card>
      </div>

      {/* Dersler Kutucukları */}
      {subjects.length === 0 ? (
        <Card>
          <CardContent className="py-8 sm:py-12 text-center">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm sm:text-base">
              Bu akademik yılda henüz ders tanımlanmamış
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject) => {
            const allTopics = (subject.units || []).flatMap((u) => u.topics || [])
            const completedTopics = allTopics.filter((t) => t.progress?.[0]?.status === "TAMAMLANDI").length
            const totalTopics = allTopics.length
            const completionRate = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0

            return (
              <Link key={subject.id} href={`/neredeyiz/ilerleme/${subject.id}`}>
                <Card className="cursor-pointer transition-all duration-200 hover:shadow-lg h-full">
                  <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                        {subject.name}
                        <span className="text-sm font-normal text-gray-600">
                          - {subject.grade}. Sınıf
                          {subject.section && ` - ${subject.section} Şubesi`}
                        </span>
                      </CardTitle>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Toplam Konu:</span>
                        <span className="font-semibold">{totalTopics}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Tamamlanan:</span>
                        <span className="font-semibold text-green-600">{completedTopics}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${completionRate}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 text-center">
                        %{completionRate} Tamamlandı
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
