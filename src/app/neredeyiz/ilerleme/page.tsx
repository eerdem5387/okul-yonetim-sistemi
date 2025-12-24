"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ToastContainer, useToast } from "@/components/ui/toast"
import {
  Loader2,
  BookOpen,
  TrendingUp,
  ChevronRight,
  Search,
  X,
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
  const searchParams = useSearchParams()
  const statusFilter = searchParams.get("status") || ""
  const { toasts, error, removeToast } = useToast()
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedYearId, setSelectedYearId] = useState<string>("")
  const [selectedGrade, setSelectedGrade] = useState<string>("")
  const [selectedSection, setSelectedSection] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [quickGradeFilter, setQuickGradeFilter] = useState<"" | "ortaokul" | "lise">("")
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
      // ✅ Rehberlik kullanıcısı kontrolü
      const role = typeof window !== "undefined" ? localStorage.getItem("auth_role") : null
      const staffId = typeof window !== "undefined" ? localStorage.getItem("staff_id") : null
      
      let url = `/api/neredeyiz/subjects?academicYearId=${selectedYearId}`
      if (selectedGrade) {
        url += `&grade=${selectedGrade}`
      }
      if (selectedSection) {
        url += `&section=${selectedSection}`
      }
      // ✅ Rehberlik kullanıcısı için: Sadece kendisine atanmış sınıfların derslerini göster
      if (role === "counselor" && staffId) {
        url += `&counselorId=${staffId}`
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

      {/* Gelişmiş Filtreler ve Arama */}
      <Card>
        <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
          <CardTitle className="text-base sm:text-lg">Filtrele ve Ara</CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
          <div className="space-y-4">
            {/* Hızlı Filtreler - Ortaokul/Lise */}
            <div>
              <label className="text-xs sm:text-sm mb-1.5 block font-medium text-gray-700">Hızlı Filtreler</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    if (quickGradeFilter === "ortaokul") {
                      setQuickGradeFilter("")
                      setSelectedGrade("")
                    } else {
                      setQuickGradeFilter("ortaokul")
                      setSelectedGrade("") // Reset individual grade selection
                    }
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-lg border-2 transition-all ${
                    quickGradeFilter === "ortaokul"
                      ? "border-blue-600 bg-blue-600 text-white shadow-md"
                      : "border-blue-300 text-blue-700 hover:bg-blue-50"
                  }`}
                >
                  🎒 Ortaokul (5-8)
                </button>
                <button
                  onClick={() => {
                    if (quickGradeFilter === "lise") {
                      setQuickGradeFilter("")
                      setSelectedGrade("")
                    } else {
                      setQuickGradeFilter("lise")
                      setSelectedGrade("") // Reset individual grade selection
                    }
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-lg border-2 transition-all ${
                    quickGradeFilter === "lise"
                      ? "border-purple-600 bg-purple-600 text-white shadow-md"
                      : "border-purple-300 text-purple-700 hover:bg-purple-50"
                  }`}
                >
                  🎓 Lise (9-12)
                </button>
              </div>
            </div>

            {/* Arama */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Ders adına göre ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 text-sm"
              />
            </div>
            
            {/* Filtreler */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs sm:text-sm mb-1.5 block font-medium text-gray-700">Akademik Yıl</label>
                <select
                  value={selectedYearId}
                  onChange={(e) => setSelectedYearId(e.target.value)}
                  className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                >
                  {academicYears.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name} {year.isActive && "(Aktif)"}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-xs sm:text-sm mb-1.5 block font-medium text-gray-700">Sınıf</label>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tüm Sınıflar</option>
                  {[5, 6, 7, 8, 9, 10, 11, 12].map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}. Sınıf
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-xs sm:text-sm mb-1.5 block font-medium text-gray-700">Şube</label>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
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
              </div>
            </div>

            {/* Aktif Filtre Özeti */}
            {(selectedGrade || selectedSection || searchQuery || statusFilter) && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                <span className="text-xs sm:text-sm text-gray-600 font-medium">Aktif Filtreler:</span>
                {selectedGrade && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                    {selectedGrade}. Sınıf
                    <button onClick={() => setSelectedGrade("")} className="hover:bg-blue-200 rounded-full p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {selectedSection && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                    {selectedSection} Şubesi
                    <button onClick={() => setSelectedSection("")} className="hover:bg-blue-200 rounded-full p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                    &quot;{searchQuery}&quot;
                    <button onClick={() => setSearchQuery("")} className="hover:bg-purple-200 rounded-full p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {statusFilter && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                    {statusFilter === "TAMAMLANDI" && "Tamamlanan"}
                    {statusFilter === "DEVAM_EDIYOR" && "Devam Ediyor"}
                    {statusFilter === "GECIKMELI" && "Gecikmeli"}
                  </span>
                )}
                <button
                  onClick={() => {
                    setSelectedGrade("")
                    setSelectedSection("")
                    setSearchQuery("")
                  }}
                  className="text-xs text-red-600 hover:text-red-700 font-medium ml-2"
                >
                  Tümünü Temizle
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dersler Kutucukları */}
      {(() => {
        const filteredSubjects = subjects
          .filter((subject) => {
            // Arama filtresi
            if (searchQuery) {
              const query = searchQuery.toLowerCase()
              if (!subject.name.toLowerCase().includes(query)) return false
            }
            
            // Hızlı sınıf filtresi (Ortaokul/Lise)
            if (quickGradeFilter === "ortaokul") {
              if (![5, 6, 7, 8].includes(subject.grade)) return false
            } else if (quickGradeFilter === "lise") {
              if (![9, 10, 11, 12].includes(subject.grade)) return false
            }
            
            return true
          })
          .map((subject) => {
              const allTopics = (subject.units || []).flatMap((u) => u.topics || [])
              const completedTopics = allTopics.filter((t) => t.progress?.[0]?.status === "TAMAMLANDI").length
              const inProgressTopics = allTopics.filter((t) => t.progress?.[0]?.status === "DEVAM_EDIYOR").length
              const delayedTopics = allTopics.filter((t) => {
                const progress = t.progress?.[0]
                if (!t.plannedEndDate) return false
                const now = new Date()
                now.setHours(0, 0, 0, 0)
                const plannedEnd = new Date(t.plannedEndDate)
                plannedEnd.setHours(0, 0, 0, 0)
                
                // Eğer tarih geçmişse
                if (now > plannedEnd) {
                  // Progress kaydı yoksa veya TAMAMLANDI değilse gecikmeli
                  if (!progress || progress.status !== "TAMAMLANDI") {
                    return true
                  }
                  // TAMAMLANDI ama gecikmeli tamamlanmışsa
                  if (progress.status === "TAMAMLANDI" && progress.actualEndDate) {
                    const actualEnd = new Date(progress.actualEndDate)
                    actualEnd.setHours(0, 0, 0, 0)
                    return actualEnd > plannedEnd
                  }
                }
                return false
              }).length

              const earlyTopics = allTopics.filter((t) => {
                const progress = t.progress?.[0]
                if (!t.plannedEndDate || !progress || progress.status !== "TAMAMLANDI" || !progress.actualEndDate) return false
                const plannedEnd = new Date(t.plannedEndDate)
                plannedEnd.setHours(0, 0, 0, 0)
                const actualEnd = new Date(progress.actualEndDate)
                actualEnd.setHours(0, 0, 0, 0)
                return actualEnd < plannedEnd
              }).length
              
              const lateCompletedTopics = allTopics.filter((t) => {
                const progress = t.progress?.[0]
                if (!t.plannedEndDate || !progress || progress.status !== "TAMAMLANDI" || !progress.actualEndDate) return false
                const plannedEnd = new Date(t.plannedEndDate)
                plannedEnd.setHours(0, 0, 0, 0)
                const actualEnd = new Date(progress.actualEndDate)
                actualEnd.setHours(0, 0, 0, 0)
                return actualEnd > plannedEnd
              }).length
              
              const totalTopics = allTopics.length
              const completionRate = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0

              // Status filtresine göre filtrele
              if (statusFilter) {
                if (statusFilter === "TAMAMLANDI" && completedTopics === 0) return null
                if (statusFilter === "DEVAM_EDIYOR" && inProgressTopics === 0) return null
                if (statusFilter === "GECIKMELI" && delayedTopics === 0) return null
                if (statusFilter === "ERKEN_TAMAMLANDI" && earlyTopics === 0) return null
                if (statusFilter === "GECIKMELI_TAMAMLANDI" && lateCompletedTopics === 0) return null
              }

              return { subject, completedTopics, inProgressTopics, delayedTopics, earlyTopics, lateCompletedTopics, totalTopics, completionRate }
            })
            .filter((item): item is NonNullable<typeof item> => item !== null)

        if (subjects.length === 0) {
          return (
            <Card>
              <CardContent className="py-8 sm:py-12 text-center">
                <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm sm:text-base">
                  Bu akademik yılda henüz ders tanımlanmamış
                </p>
              </CardContent>
            </Card>
          )
        }

        if (filteredSubjects.length === 0) {
          const statusLabels: Record<string, string> = {
            TAMAMLANDI: "tamamlanan",
            DEVAM_EDIYOR: "devam eden",
            GECIKMELI: "gecikmeli",
          }
          return (
            <Card>
              <CardContent className="py-8 sm:py-12 text-center">
                <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm sm:text-base font-medium mb-1">
                  {statusFilter ? `${statusLabels[statusFilter] || statusFilter} konu bulunamadı` : "Ders bulunamadı"}
                </p>
                <p className="text-gray-400 text-xs sm:text-sm">
                  {statusFilter 
                    ? "Seçili filtreye uygun ders bulunmamaktadır."
                    : "Bu akademik yılda henüz ders tanımlanmamış"}
                </p>
              </CardContent>
            </Card>
          )
        }

        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSubjects.map(({ subject, completedTopics, totalTopics, completionRate }) => (
              <Link key={subject.id} href={`/neredeyiz/ilerleme/${subject.id}${statusFilter ? `?status=${statusFilter}` : ""}`}>
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
            ))}
          </div>
        )
      })()}
    </div>
  )
}
