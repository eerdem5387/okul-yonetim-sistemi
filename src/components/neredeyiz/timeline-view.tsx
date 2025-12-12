"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { BookOpen, Calendar, Clock, CheckCircle2, AlertTriangle } from "lucide-react"

interface TimelineTopic {
  id: string
  name: string
  plannedStartDate: string | null
  plannedEndDate: string | null
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
}

interface TimelineViewProps {
  topics: TimelineTopic[]
  onTopicClick?: (topic: TimelineTopic) => void
}

export default function TimelineView({ topics, onTopicClick }: TimelineViewProps) {
  // Konuları tarihe göre sırala
  const sortedTopics = [...topics].sort((a, b) => {
    const dateA = a.plannedStartDate ? new Date(a.plannedStartDate).getTime() : 0
    const dateB = b.plannedStartDate ? new Date(b.plannedStartDate).getTime() : 0
    return dateA - dateB
  })

  // Tarih gruplarına ayır
  const groupedByDate = sortedTopics.reduce((acc, topic) => {
    if (!topic.plannedStartDate) return acc
    const dateKey = format(new Date(topic.plannedStartDate), "yyyy-MM-dd", { locale: tr })
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    acc[dateKey].push(topic)
    return acc
  }, {} as Record<string, TimelineTopic[]>)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "TAMAMLANDI":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case "DEVAM_EDIYOR":
        return <Clock className="h-4 w-4 text-yellow-600" />
      case "GECIKMELI":
      case "GECIKMELI_TAMAMLANDI":
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return <Calendar className="h-4 w-4 text-blue-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "TAMAMLANDI":
        return "border-green-500 bg-green-50"
      case "DEVAM_EDIYOR":
        return "border-yellow-500 bg-yellow-50"
      case "GECIKMELI":
      case "GECIKMELI_TAMAMLANDI":
        return "border-red-500 bg-red-50"
      default:
        return "border-blue-500 bg-blue-50"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "TAMAMLANDI":
        return "Tamamlandı"
      case "DEVAM_EDIYOR":
        return "Devam Ediyor"
      case "GECIKMELI":
        return "Gecikmeli"
      case "GECIKMELI_TAMAMLANDI":
        return "Gecikmeli Tamamlandı"
      default:
        return "Planlandı"
    }
  }

  if (sortedTopics.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Timeline görünümü için konu bulunamadı.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
        <CardTitle className="text-base sm:text-lg">Timeline Görünümü</CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-4 sm:left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

          <div className="space-y-6 sm:space-y-8">
            {Object.entries(groupedByDate)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([dateKey, dateTopics]) => {
                const date = new Date(dateKey)
                return (
                  <div key={dateKey} className="relative pl-8 sm:pl-12">
                    {/* Date Marker */}
                    <div className="absolute left-0 sm:left-2 top-1">
                      <div className="h-3 w-3 sm:h-4 sm:w-4 rounded-full bg-blue-600 border-2 border-white shadow-md" />
                    </div>

                    {/* Date Header */}
                    <div className="mb-4">
                      <div className="text-sm sm:text-base font-semibold text-gray-900">
                        {format(date, "d MMMM yyyy", { locale: tr })}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {format(date, "EEEE", { locale: tr })}
                      </div>
                    </div>

                    {/* Topics */}
                    <div className="space-y-3 sm:space-y-4 ml-0 sm:ml-4">
                      {dateTopics.map((topic) => (
                        <div
                          key={topic.id}
                          onClick={() => onTopicClick?.(topic)}
                          className={`border-l-4 rounded-r-lg p-3 sm:p-4 cursor-pointer transition-all hover:shadow-md ${getStatusColor(
                            topic.status
                          )}`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                {getStatusIcon(topic.status)}
                                <h3 className="font-semibold text-sm sm:text-base text-gray-900 truncate">
                                  {topic.name}
                                </h3>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-white/80 text-gray-700 whitespace-nowrap">
                                  {getStatusLabel(topic.status)}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <BookOpen className="h-3 w-3" />
                                  <span>
                                    {topic.subject.name} - {topic.subject.grade}. Sınıf
                                    {topic.subject.section && ` - ${topic.subject.section}`}
                                  </span>
                                </div>
                                <div className="text-gray-500">
                                  Ünite: {topic.unit.name}
                                </div>
                              </div>
                              {topic.plannedStartDate && topic.plannedEndDate && (
                                <div className="mt-2 text-xs text-gray-500">
                                  {format(new Date(topic.plannedStartDate), "d MMM", { locale: tr })} -{" "}
                                  {format(new Date(topic.plannedEndDate), "d MMM yyyy", { locale: tr })}
                                </div>
                              )}
                            </div>
                            {topic.delayDays && topic.delayDays > 0 && (
                              <div className="flex-shrink-0">
                                <div className="text-right">
                                  <div className="text-lg sm:text-xl font-bold text-red-600">
                                    +{topic.delayDays}
                                  </div>
                                  <div className="text-[10px] sm:text-xs text-gray-500">Gün</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

