"use client"

import React, { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { BookOpen, Calendar, Clock, CheckCircle2, AlertTriangle, Filter, X } from "lucide-react"

interface KanbanTopic {
  id: string
  name: string
  plannedStartDate: string | null
  plannedEndDate: string | null
  actualEndDate?: string | null
  status: "PLANLANDI" | "DEVAM_EDIYOR" | "TAMAMLANDI" | "GECIKMELI" | "GECIKMELI_TAMAMLANDI"
  delayDays?: number
  subject: {
    name: string
    grade: number
    section: string | null
  }
  unit: {
    name: string
  }
  teachers?: Array<{
    id: string
    firstName: string
    lastName: string
  }>
  markedByStaff?: {
    firstName: string
    lastName: string
  } | null
  approvedByStaff?: {
    firstName: string
    lastName: string
  } | null
}

interface KanbanViewProps {
  topics: KanbanTopic[]
  onTopicClick?: (topic: KanbanTopic) => void
}

export default function KanbanView({ topics, onTopicClick }: KanbanViewProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedGrade, setSelectedGrade] = useState<string>("")
  const [selectedSubject, setSelectedSubject] = useState<string>("")
  const [showFilters, setShowFilters] = useState(false)

  // Filtreleme
  const filteredTopics = useMemo(() => {
    return topics.filter((topic) => {
      const matchesSearch = searchQuery === "" || 
        topic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        topic.subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        topic.unit.name.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesGrade = selectedGrade === "" || 
        topic.subject.grade.toString() === selectedGrade
      
      const matchesSubject = selectedSubject === "" ||
        topic.subject.name === selectedSubject

      return matchesSearch && matchesGrade && matchesSubject
    })
  }, [topics, searchQuery, selectedGrade, selectedSubject])

  // Benzersiz sınıf ve ders listeleri
  const uniqueGrades = useMemo(() => {
    return Array.from(new Set(topics.map(t => t.subject.grade))).sort((a, b) => a - b)
  }, [topics])

  const uniqueSubjects = useMemo(() => {
    return Array.from(new Set(topics.map(t => t.subject.name))).sort()
  }, [topics])

  // Konuları duruma göre grupla
  const groupedTopics = useMemo(() => {
    const groups: Record<string, KanbanTopic[]> = {
      PLANLANDI: [],
      DEVAM_EDIYOR: [],
      TAMAMLANDI: [],
      GECIKMELI: [],
    }

    filteredTopics.forEach((topic) => {
      if (topic.status === "GECIKMELI_TAMAMLANDI") {
        groups.GECIKMELI.push(topic)
      } else {
        groups[topic.status]?.push(topic)
      }
    })

    return groups
  }, [filteredTopics])

  const columns = [
    {
      id: "PLANLANDI",
      title: "Planlandı",
      icon: Calendar,
      color: "border-blue-500 bg-blue-50",
      headerColor: "bg-blue-500",
      topics: groupedTopics.PLANLANDI,
    },
    {
      id: "DEVAM_EDIYOR",
      title: "Devam Ediyor",
      icon: Clock,
      color: "border-yellow-500 bg-yellow-50",
      headerColor: "bg-yellow-500",
      topics: groupedTopics.DEVAM_EDIYOR,
    },
    {
      id: "TAMAMLANDI",
      title: "Tamamlandı",
      icon: CheckCircle2,
      color: "border-green-500 bg-green-50",
      headerColor: "bg-green-500",
      topics: groupedTopics.TAMAMLANDI,
    },
    {
      id: "GECIKMELI",
      title: "Gecikmeli",
      icon: AlertTriangle,
      color: "border-red-500 bg-red-50",
      headerColor: "bg-red-500",
      topics: groupedTopics.GECIKMELI,
    },
  ]

  if (topics.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Kanban görünümü için konu bulunamadı.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base sm:text-lg">Kanban Görünümü</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="text-xs sm:text-sm"
            >
              <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Filtreler
              {(searchQuery || selectedGrade || selectedSubject) && (
                <span className="ml-1 sm:ml-2 px-1.5 py-0.5 bg-blue-600 text-white rounded-full text-[10px] sm:text-xs">
                  {[searchQuery, selectedGrade, selectedSubject].filter(Boolean).length}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Filtreleme Paneli */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Arama */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Arama
                </label>
                <Input
                  type="text"
                  placeholder="Konu, ders, ünite ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>

              {/* Sınıf Filtresi */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Sınıf
                </label>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="w-full h-9 sm:h-10 px-3 py-2 border border-gray-300 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tüm Sınıflar</option>
                  {uniqueGrades.map((grade) => (
                    <option key={grade} value={grade.toString()}>
                      {grade}. Sınıf
                    </option>
                  ))}
                </select>
              </div>

              {/* Ders Filtresi */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Ders
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full h-9 sm:h-10 px-3 py-2 border border-gray-300 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tüm Dersler</option>
                  {uniqueSubjects.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Aktif Filtreler ve Temizle */}
            {(searchQuery || selectedGrade || selectedSubject) && (
              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                  <span className="font-medium text-gray-700">Aktif Filtreler:</span>
                  {searchQuery && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                      Arama: {searchQuery}
                    </span>
                  )}
                  {selectedGrade && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                      {selectedGrade}. Sınıf
                    </span>
                  )}
                  {selectedSubject && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                      {selectedSubject}
                    </span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("")
                    setSelectedGrade("")
                    setSelectedSubject("")
                  }}
                  className="text-xs sm:text-sm"
                >
                  <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  Temizle
                </Button>
              </div>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
        {filteredTopics.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Filtrelere uygun konu bulunamadı.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {columns.map((column) => {
            const Icon = column.icon
            return (
              <div key={column.id} className="flex flex-col min-h-[400px]">
                {/* Column Header */}
                <div
                  className={`${column.headerColor} text-white rounded-t-lg px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="font-semibold text-sm sm:text-base">{column.title}</span>
                  </div>
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs sm:text-sm font-medium">
                    {column.topics.length}
                  </span>
                </div>

                {/* Column Content */}
                <div className={`flex-1 border-2 border-t-0 ${column.color} rounded-b-lg p-2 sm:p-3 space-y-2 sm:space-y-3 overflow-y-auto max-h-[600px]`}>
                  {column.topics.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-xs sm:text-sm">
                      Bu kategoride konu yok
                    </div>
                  ) : (
                    column.topics.map((topic) => (
                      <div
                        key={topic.id}
                        onClick={() => onTopicClick?.(topic)}
                        className="bg-white rounded-lg p-2 sm:p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200"
                      >
                        <h3 className="font-semibold text-xs sm:text-sm text-gray-900 mb-2 line-clamp-2">
                          {topic.name}
                        </h3>
                        <div className="space-y-1.5 text-[10px] sm:text-xs text-gray-600">
                          <div className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">
                              {topic.subject.name} - {topic.subject.grade}. Sınıf
                              {topic.subject.section && ` - ${topic.subject.section}`}
                            </span>
                          </div>
                          <div className="text-gray-500 truncate">📚 Ünite: {topic.unit.name}</div>
                          
                          {/* Öğretmen Bilgisi */}
                          {topic.teachers && topic.teachers.length > 0 && (
                            <div className="text-gray-600 truncate">
                              👨‍🏫 {topic.teachers.map((t) => `${t.firstName} ${t.lastName}`).join(", ")}
                            </div>
                          )}
                          
                          {/* Tarihler */}
                          {topic.plannedStartDate && topic.plannedEndDate && (
                            <div className="text-gray-500">
                              📅 {new Date(topic.plannedStartDate).toLocaleDateString("tr-TR", {
                                day: "numeric",
                                month: "short",
                              })}{" "}
                              -{" "}
                              {new Date(topic.plannedEndDate).toLocaleDateString("tr-TR", {
                                day: "numeric",
                                month: "short",
                              })}
                            </div>
                          )}
                          
                          {/* Tamamlanma Tarihi */}
                          {topic.actualEndDate && (
                            <div className="text-green-600 font-medium">
                              ✓ {new Date(topic.actualEndDate).toLocaleDateString("tr-TR", {
                                day: "numeric",
                                month: "short",
                              })}
                            </div>
                          )}
                          
                          {/* Gecikme */}
                          {topic.delayDays && topic.delayDays > 0 && (
                            <div className="text-red-600 font-medium">
                              ⚠ +{topic.delayDays} gün gecikme
                            </div>
                          )}
                          
                          {/* Bildiren/Onaylayan */}
                          <div className="border-t border-gray-200 pt-1.5 mt-1.5 space-y-0.5">
                            {topic.markedByStaff && (
                              <div className="text-blue-600 text-[9px] sm:text-[10px]">
                                ✎ Bildiren: {topic.markedByStaff.firstName} {topic.markedByStaff.lastName}
                              </div>
                            )}
                            {topic.approvedByStaff && (
                              <div className="text-green-600 text-[9px] sm:text-[10px]">
                                ✓ Onaylayan: {topic.approvedByStaff.firstName} {topic.approvedByStaff.lastName}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
      </CardContent>
    </Card>
  )
}

