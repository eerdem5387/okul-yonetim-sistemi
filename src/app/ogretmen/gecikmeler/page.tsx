"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  AlertTriangle,
  Loader2,
  LogOut,
  ArrowLeft,
  ArrowRight,
  Clock,
  BookOpen,
  Calendar,
  TrendingUp,
  CheckCircle2,
} from "lucide-react"
import Link from "next/link"

interface DelayedTopic {
  id: string
  name: string
  plannedEndDate: string | null
  delayDays: number
  unit: {
    id: string
    name: string
  }
  subject: {
    id: string
    name: string
    grade: number
    section: string | null
    academicYear: {
      id: string
      name: string
    }
  }
  progress: Array<{
    id: string
    status: string
    actualEndDate: string | null
  }>
}

interface DelayedData {
  delayedTopics: DelayedTopic[]
  groupedBySubject: Array<{
    subject: {
      id: string
      name: string
      grade: number
      section: string | null
      academicYear: {
        id: string
        name: string
      }
    }
    delayedTopics: DelayedTopic[]
    totalDelayDays: number
  }>
  summary: {
    totalDelayedTopics: number
    totalSubjects: number
    averageDelayDays: number
  }
}

export default function GecikmelerPage() {
  const router = useRouter()
  const [delayedData, setDelayedData] = useState<DelayedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [staffName, setStaffName] = useState<string>("")
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("auth_role")
      const id = localStorage.getItem("staff_id")
      const name = localStorage.getItem("staff_name")

      if (role !== "teacher" || !id) {
        router.push("/login")
        return
      }

      setStaffName(name || "")
      fetchDelayedTopics(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchDelayedTopics = async (staffId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/neredeyiz/teachers/delayed-topics?staffId=${staffId}`)
      if (response.ok) {
        const data = await response.json()
        setDelayedData(data)
      }
    } catch (err) {
      console.error("Error fetching delayed topics:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("auth_role")
    localStorage.removeItem("auth_token")
    localStorage.removeItem("staff_id")
    localStorage.removeItem("staff_name")
    localStorage.removeItem("staff_department")
    router.push("/login")
    router.refresh()
  }

  const getStatusBadge = (topic: DelayedTopic) => {
    const progress = topic.progress?.[0]
    if (progress?.status === "TAMAMLANDI") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          <CheckCircle2 className="h-3 w-3" />
          Gecikmeli Tamamlandı
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <AlertTriangle className="h-3 w-3" />
        Gecikmeli
      </span>
    )
  }

  const filteredData = selectedSubjectId
    ? delayedData?.groupedBySubject.filter((g) => g.subject.id === selectedSubjectId)
    : delayedData?.groupedBySubject

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-red-50/30 to-orange-50/30">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Gecikme Yaşanan Dersler</h1>
                <p className="text-sm text-gray-600">{staffName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/ogretmen">
                <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Ana Panele Dön
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleLogout} className="text-xs sm:text-sm">
                <LogOut className="h-4 w-4 mr-2" />
                Çıkış Yap
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Özet İstatistikler */}
        {delayedData && delayedData.summary.totalDelayedTopics > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6">
            <Card className="border-l-4 border-l-red-500 bg-gradient-to-r from-red-50 to-white">
              <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm sm:text-base font-semibold text-gray-700">
                    Gecikmeli Konu
                  </CardTitle>
                  <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                <div className="text-3xl sm:text-4xl font-bold text-red-600 mb-2">
                  {delayedData.summary.totalDelayedTopics}
                </div>
                <p className="text-xs sm:text-sm text-gray-600">Toplam gecikmeli konu sayısı</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-white">
              <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm sm:text-base font-semibold text-gray-700">
                    Etkilenen Ders
                  </CardTitle>
                  <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                <div className="text-3xl sm:text-4xl font-bold text-orange-600 mb-2">
                  {delayedData.summary.totalSubjects}
                </div>
                <p className="text-xs sm:text-sm text-gray-600">Gecikme yaşayan ders sayısı</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-yellow-500 bg-gradient-to-r from-yellow-50 to-white">
              <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm sm:text-base font-semibold text-gray-700">
                    Ortalama Gecikme
                  </CardTitle>
                  <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                <div className="text-3xl sm:text-4xl font-bold text-yellow-600 mb-2">
                  {delayedData.summary.averageDelayDays}
                </div>
                <p className="text-xs sm:text-sm text-gray-600">Gün cinsinden ortalama gecikme</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Ders Filtresi */}
        {delayedData && delayedData.groupedBySubject.length > 1 && (
          <Card className="mb-6">
            <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
              <CardTitle className="text-base sm:text-lg">Ders Filtresi</CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedSubjectId === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSubjectId(null)}
                  className="text-xs sm:text-sm"
                >
                  Tüm Dersler
                </Button>
                {delayedData.groupedBySubject.map((group) => (
                  <Button
                    key={group.subject.id}
                    variant={selectedSubjectId === group.subject.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSubjectId(group.subject.id)}
                    className="text-xs sm:text-sm"
                  >
                    {group.subject.name} ({group.delayedTopics.length})
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Gecikme Yaşanan Konular */}
        {!delayedData || delayedData.summary.totalDelayedTopics === 0 ? (
          <Card>
            <CardContent className="py-12 sm:py-16 text-center">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                Harika! Gecikme Yok
              </h3>
              <p className="text-gray-600 text-sm sm:text-base mb-4">
                Tüm dersleriniz planlanan takvime göre ilerliyor.
              </p>
              <Link href="/ogretmen">
                <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Ana Panele Dön
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {filteredData?.map((group) => (
              <Card
                key={group.subject.id}
                className="border-l-4 border-l-red-500 hover:shadow-lg transition-shadow"
              >
                <CardHeader className="px-4 sm:px-6 py-4 sm:py-6 bg-gradient-to-r from-red-50 to-white">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                          <BookOpen className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <CardTitle className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
                            {group.subject.name}
                          </CardTitle>
                          <p className="text-xs sm:text-sm text-gray-600 mt-1">
                            {group.subject.grade}. Sınıf
                            {group.subject.section && ` - ${group.subject.section} Şubesi`} •{" "}
                            {group.subject.academicYear.name}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                      <div className="text-center sm:text-right">
                        <p className="text-xs sm:text-sm text-gray-600">Toplam Gecikme</p>
                        <p className="text-lg sm:text-xl font-bold text-red-600">
                          {group.totalDelayDays} gün
                        </p>
                      </div>
                      <Link href={`/ogretmen/dersler/${group.subject.id}`}>
                        <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                          Derse Git
                          <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                  <div className="space-y-3 sm:space-y-4">
                    {group.delayedTopics.map((topic) => (
                      <div
                        key={topic.id}
                        className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-white hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <h4 className="font-semibold text-sm sm:text-base text-gray-900">
                                {topic.name}
                              </h4>
                              {getStatusBadge(topic)}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span>{topic.unit.name}</span>
                              </div>
                              {topic.plannedEndDate && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                                  <span>
                                    Planlanan:{" "}
                                    {new Date(topic.plannedEndDate).toLocaleDateString("tr-TR")}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className="text-center sm:text-right">
                              <p className="text-xs text-gray-500 mb-1">Gecikme Süresi</p>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4 text-red-600" />
                                <p className="text-lg sm:text-xl font-bold text-red-600">
                                  {topic.delayDays} gün
                                </p>
                              </div>
                            </div>
                            <Link href={`/ogretmen/dersler/${topic.subject.id}`}>
                              <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                Detay
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

