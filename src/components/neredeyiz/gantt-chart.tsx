"use client"

import React, { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval } from "date-fns"
import { tr } from "date-fns/locale"

interface GanttTopic {
  id: string
  name: string
  plannedStartDate: string | null
  plannedEndDate: string | null
  actualEndDate?: string | null
  status: "PLANLANDI" | "DEVAM_EDIYOR" | "TAMAMLANDI" | "GECIKMELI" | "GECIKMELI_TAMAMLANDI"
  subject: {
    name: string
    grade: number
    section: string | null
  }
  unit: {
    name: string
  }
  delayDays?: number
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

interface GanttChartProps {
  topics: GanttTopic[]
  onTopicClick?: (topic: GanttTopic) => void
}

type ViewMode = "week" | "month" | "year"

export default function GanttChart({ topics, onTopicClick }: GanttChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("month")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [hoveredTopic, setHoveredTopic] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // Tarih aralığını hesapla
  const dateRange = useMemo(() => {
    let start: Date
    let end: Date

    if (viewMode === "week") {
      start = startOfWeek(currentDate, { weekStartsOn: 1 })
      end = endOfWeek(currentDate, { weekStartsOn: 1 })
    } else if (viewMode === "month") {
      start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    } else {
      start = new Date(currentDate.getFullYear(), 0, 1)
      end = new Date(currentDate.getFullYear(), 11, 31)
    }

    return { start, end }
  }, [viewMode, currentDate])

  // Tarih listesi
  const dates = useMemo(() => {
    if (viewMode === "week") {
      return eachDayOfInterval({ start: dateRange.start, end: dateRange.end })
    } else if (viewMode === "month") {
      // Haftalık görünüm için
      const weeks: Date[][] = []
      let currentWeekStart = startOfWeek(dateRange.start, { weekStartsOn: 1 })
      const monthEnd = dateRange.end

      while (currentWeekStart <= monthEnd) {
        const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 })
        weeks.push(eachDayOfInterval({ start: currentWeekStart, end: weekEnd }))
        currentWeekStart = addWeeks(currentWeekStart, 1)
      }

      return weeks.flat()
    } else {
      // Yıllık görünüm için aylar
      return Array.from({ length: 12 }, (_, i) => new Date(currentDate.getFullYear(), i, 1))
    }
  }, [viewMode, dateRange, currentDate])

  // Konuları tarih aralığına göre filtrele
  const filteredTopics = useMemo(() => {
    return topics.filter((topic) => {
      if (!topic.plannedStartDate || !topic.plannedEndDate) return false
      const start = new Date(topic.plannedStartDate)
      const end = new Date(topic.plannedEndDate)
      return (start <= dateRange.end && end >= dateRange.start)
    })
  }, [topics, dateRange])

  // Durum rengi
  const getStatusColor = (status: string) => {
    switch (status) {
      case "TAMAMLANDI":
        return "bg-green-500"
      case "DEVAM_EDIYOR":
        return "bg-yellow-500"
      case "GECIKMELI":
      case "GECIKMELI_TAMAMLANDI":
        return "bg-red-500"
      default:
        return "bg-blue-500"
    }
  }

  // Konu pozisyonunu hesapla
  const getTopicPosition = (topic: GanttTopic) => {
    if (!topic.plannedStartDate || !topic.plannedEndDate) return null

    const start = new Date(topic.plannedStartDate)
    const end = new Date(topic.plannedEndDate)

    // Tarih aralığı içindeki pozisyonu hesapla
    const rangeStart = dateRange.start.getTime()
    const rangeEnd = dateRange.end.getTime()
    const topicStart = Math.max(start.getTime(), rangeStart)
    const topicEnd = Math.min(end.getTime(), rangeEnd)

    const totalRange = rangeEnd - rangeStart
    const left = ((topicStart - rangeStart) / totalRange) * 100
    const width = ((topicEnd - topicStart) / totalRange) * 100

    return { left: Math.max(0, left), width: Math.min(100, width) }
  }

  const navigateDate = (direction: "prev" | "next") => {
    if (viewMode === "week") {
      setCurrentDate((prev) => (direction === "prev" ? subWeeks(prev, 1) : addWeeks(prev, 1)))
    } else if (viewMode === "month") {
      setCurrentDate((prev) => {
        const newDate = new Date(prev)
        newDate.setMonth(prev.getMonth() + (direction === "prev" ? -1 : 1))
        return newDate
      })
    } else {
      setCurrentDate((prev) => {
        const newDate = new Date(prev)
        newDate.setFullYear(prev.getFullYear() + (direction === "prev" ? -1 : 1))
        return newDate
      })
    }
  }

  const resetToToday = () => {
    setCurrentDate(new Date())
  }

  return (
    <Card>
      <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base sm:text-lg">Gantt Takvimi</CardTitle>
          <div className="flex items-center gap-2">
            {/* Görünüm Modu */}
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                onClick={() => setViewMode("week")}
                className={`px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
                  viewMode === "week"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Hafta
              </button>
              <button
                onClick={() => setViewMode("month")}
                className={`px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors border-l border-r border-gray-300 ${
                  viewMode === "month"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Ay
              </button>
              <button
                onClick={() => setViewMode("year")}
                className={`px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
                  viewMode === "year"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Yıl
              </button>
            </div>

            {/* Navigasyon */}
            <div className="flex items-center gap-1 border border-gray-300 rounded-lg overflow-hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateDate("prev")}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetToToday}
                className="h-8 px-3 text-xs sm:text-sm"
              >
                Bugün
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateDate("next")}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
        {filteredTopics.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-sm">Seçili tarih aralığında konu bulunamadı.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Tarih Başlıkları */}
              <div className="flex border-b border-gray-200 mb-4">
                {viewMode === "week" &&
                  dates.map((date, index) => (
                    <div
                      key={index}
                      className="flex-1 text-center py-2 border-r border-gray-200 last:border-r-0"
                    >
                      <div className="text-xs font-medium text-gray-700">
                        {format(date, "EEE", { locale: tr })}
                      </div>
                      <div className="text-sm font-semibold text-gray-900">
                        {format(date, "d MMM", { locale: tr })}
                      </div>
                    </div>
                  ))}
                {viewMode === "month" && (
                  <div className="flex-1 text-center py-2">
                    <div className="text-sm font-semibold text-gray-900">
                      {format(currentDate, "MMMM yyyy", { locale: tr })}
                    </div>
                  </div>
                )}
                {viewMode === "year" && (
                  <div className="flex-1 text-center py-2">
                    <div className="text-sm font-semibold text-gray-900">
                      {format(currentDate, "yyyy", { locale: tr })}
                    </div>
                  </div>
                )}
              </div>

              {/* Konular */}
              <div className="space-y-2">
                {filteredTopics.map((topic) => {
                  const position = getTopicPosition(topic)
                  if (!position) return null

                  return (
                    <div
                      key={topic.id}
                      className="relative h-12 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => onTopicClick?.(topic)}
                    >
                      {/* Konu Bilgisi */}
                      <div className="absolute left-0 top-0 h-full flex items-center px-2 bg-white border-r border-gray-200 z-10 min-w-[200px]">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                            {topic.name}
                          </div>
                          <div className="text-[10px] text-gray-500 truncate">
                            {topic.subject.name} - {topic.subject.grade}. Sınıf
                            {topic.subject.section && ` - ${topic.subject.section}`}
                          </div>
                        </div>
                      </div>

                      {/* Timeline Çubuğu */}
                      <div className="ml-[200px] relative h-full">
                        <div
                          className={`absolute top-2 h-8 rounded ${getStatusColor(
                            topic.status
                          )} text-white flex items-center px-2 text-xs font-medium shadow-sm hover:shadow-md transition-shadow`}
                          style={{
                            left: `${position.left}%`,
                            width: `${Math.max(position.width, 2)}%`,
                            minWidth: "40px",
                          }}
                          onMouseEnter={(e) => {
                            setHoveredTopic(topic.id)
                            const rect = e.currentTarget.getBoundingClientRect()
                            setTooltipPosition({ x: rect.left + rect.width / 2, y: rect.top - 10 })
                          }}
                          onMouseLeave={() => setHoveredTopic(null)}
                        >
                          <span className="truncate">{topic.name}</span>
                          {topic.delayDays && topic.delayDays > 0 && (
                            <span className="ml-1 text-[10px] bg-red-600 px-1 rounded">
                              +{topic.delayDays}g
                            </span>
                          )}
                        </div>

                        {/* Tooltip */}
                        {hoveredTopic === topic.id && (
                          <div
                            className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-xl p-3 min-w-[250px] max-w-[350px]"
                            style={{
                              left: `${tooltipPosition.x}px`,
                              top: `${tooltipPosition.y}px`,
                              transform: "translate(-50%, -100%)",
                            }}
                          >
                            <div className="space-y-2 text-xs">
                              <div className="font-semibold text-gray-900 border-b pb-1">
                                {topic.name}
                              </div>
                              <div className="text-gray-700">
                                <span className="font-medium">Ders:</span> {topic.subject.name}
                              </div>
                              <div className="text-gray-700">
                                <span className="font-medium">Ünite:</span> {topic.unit.name}
                              </div>
                              {topic.teachers && topic.teachers.length > 0 && (
                                <div className="text-gray-700">
                                  <span className="font-medium">Öğretmen:</span>{" "}
                                  {topic.teachers.map((t) => `${t.firstName} ${t.lastName}`).join(", ")}
                                </div>
                              )}
                              {topic.actualEndDate && (
                                <div className="text-gray-700">
                                  <span className="font-medium">Tamamlanma:</span>{" "}
                                  {new Date(topic.actualEndDate).toLocaleDateString("tr-TR")}
                                </div>
                              )}
                              {topic.markedByStaff && (
                                <div className="text-blue-700">
                                  <span className="font-medium">Bildiren:</span>{" "}
                                  Rehberlik {topic.markedByStaff.firstName} {topic.markedByStaff.lastName}
                                </div>
                              )}
                              {topic.approvedByStaff && (
                                <div className="text-green-700">
                                  <span className="font-medium">Onaylayan:</span>{" "}
                                  Rehberlik {topic.approvedByStaff.firstName} {topic.approvedByStaff.lastName}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm">
                  <span className="font-medium text-gray-700">Durum:</span>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded bg-blue-500" />
                    <span>Planlandı</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded bg-yellow-500" />
                    <span>Devam Ediyor</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded bg-green-500" />
                    <span>Tamamlandı</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded bg-red-500" />
                    <span>Gecikmeli</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


