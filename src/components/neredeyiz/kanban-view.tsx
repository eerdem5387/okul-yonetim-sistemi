"use client"

import React, { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Calendar, Clock, CheckCircle2, AlertTriangle } from "lucide-react"

interface KanbanTopic {
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

interface KanbanViewProps {
  topics: KanbanTopic[]
  onTopicClick?: (topic: KanbanTopic) => void
}

export default function KanbanView({ topics, onTopicClick }: KanbanViewProps) {
  // Konuları duruma göre grupla
  const groupedTopics = useMemo(() => {
    const groups: Record<string, KanbanTopic[]> = {
      PLANLANDI: [],
      DEVAM_EDIYOR: [],
      TAMAMLANDI: [],
      GECIKMELI: [],
    }

    topics.forEach((topic) => {
      if (topic.status === "GECIKMELI_TAMAMLANDI") {
        groups.GECIKMELI.push(topic)
      } else {
        groups[topic.status]?.push(topic)
      }
    })

    return groups
  }, [topics])

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
        <CardTitle className="text-base sm:text-lg">Kanban Görünümü</CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
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
                        <div className="space-y-1 text-[10px] sm:text-xs text-gray-600">
                          <div className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">
                              {topic.subject.name} - {topic.subject.grade}. Sınıf
                              {topic.subject.section && ` - ${topic.subject.section}`}
                            </span>
                          </div>
                          <div className="text-gray-500 truncate">Ünite: {topic.unit.name}</div>
                          {topic.plannedStartDate && topic.plannedEndDate && (
                            <div className="text-gray-500">
                              {new Date(topic.plannedStartDate).toLocaleDateString("tr-TR", {
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
                          {topic.delayDays && topic.delayDays > 0 && (
                            <div className="text-red-600 font-medium">
                              +{topic.delayDays} gün gecikme
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

