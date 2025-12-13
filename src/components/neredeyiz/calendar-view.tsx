"use client"

import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from "date-fns"
import { tr } from "date-fns/locale"

interface CalendarTopic {
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

interface CalendarViewProps {
  topics: CalendarTopic[]
  onTopicClick?: (topic: CalendarTopic) => void
}

export default function CalendarView({ topics, onTopicClick }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [hoveredTopic, setHoveredTopic] = useState<CalendarTopic | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showMoreModal, setShowMoreModal] = useState(false)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Haftanın ilk günü için boşluklar
  const firstDayOfWeek = monthStart.getDay()
  const emptyDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1

  // Günlere göre konuları grupla
  const topicsByDate = useMemo(() => {
    const grouped: Record<string, CalendarTopic[]> = {}
    topics.forEach((topic) => {
      if (topic.plannedStartDate && topic.plannedEndDate) {
        const start = new Date(topic.plannedStartDate)
        const end = new Date(topic.plannedEndDate)
        const current = new Date(start)

        while (current <= end) {
          const dateKey = format(current, "yyyy-MM-dd")
          if (!grouped[dateKey]) {
            grouped[dateKey] = []
          }
          grouped[dateKey].push(topic)
          current.setDate(current.getDate() + 1)
        }
      }
    })
    return grouped
  }, [topics])

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

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => (direction === "prev" ? subMonths(prev, 1) : addMonths(prev, 1)))
  }

  const goToToday = () => {
    setCurrentMonth(new Date())
  }

  const weekDays = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"]

  return (
    <Card>
      <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base sm:text-lg">Takvim Görünümü</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth("prev")}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday} className="h-8 px-3 text-xs sm:text-sm">
              Bugün
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth("next")}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="mt-2 text-sm sm:text-base font-semibold text-gray-700">
          {format(currentMonth, "MMMM yyyy", { locale: tr })}
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
        {/* Hafta Günleri Başlığı */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-xs sm:text-sm font-semibold text-gray-600 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Takvim Günleri */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {/* Boş günler */}
          {Array.from({ length: emptyDays }).map((_, index) => (
            <div key={`empty-${index}`} className="aspect-square" />
          ))}

          {/* Günler */}
          {daysInMonth.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd")
            const dayTopics = topicsByDate[dateKey] || []
            const isToday = isSameDay(day, new Date())

            return (
              <div
                key={dateKey}
                className={`aspect-square border border-gray-200 rounded-lg p-1 sm:p-2 overflow-hidden ${
                  isToday ? "bg-blue-50 border-blue-400" : "bg-white hover:bg-gray-50"
                } transition-colors`}
              >
                <div className="flex flex-col h-full">
                  <div
                    className={`text-xs sm:text-sm font-semibold mb-1 ${
                      isToday ? "text-blue-600" : "text-gray-700"
                    }`}
                  >
                    {format(day, "d")}
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-0.5">
                    {dayTopics.slice(0, 3).map((topic) => (
                      <div
                        key={topic.id}
                        onClick={() => onTopicClick?.(topic)}
                        onMouseEnter={(e) => {
                          setHoveredTopic(topic)
                          const rect = e.currentTarget.getBoundingClientRect()
                          setTooltipPosition({ x: rect.left + rect.width / 2, y: rect.top - 10 })
                        }}
                        onMouseLeave={() => {
                          setHoveredTopic(null)
                          setTooltipPosition(null)
                        }}
                        className={`${getStatusColor(topic.status)} text-white text-[8px] sm:text-xs px-1 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity truncate relative`}
                      >
                        {topic.name}
                      </div>
                    ))}
                    {dayTopics.length > 3 && (
                      <button
                        onClick={() => {
                          setSelectedDate(day)
                          setShowMoreModal(true)
                        }}
                        className="text-[8px] sm:text-xs text-blue-600 hover:text-blue-700 font-medium px-1 hover:underline"
                      >
                        +{dayTopics.length - 3} daha
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 sm:mt-6 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm">
            <span className="font-medium text-gray-700">Durum:</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span>Planlandı</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-yellow-500" />
              <span>Devam Ediyor</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span>Tamamlandı</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span>Gecikmeli</span>
            </div>
          </div>
        </div>
      </CardContent>

      {/* "+X daha" Modal */}
      {showMoreModal && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg">
                  {format(selectedDate, "d MMMM yyyy", { locale: tr })} - Tüm Konular
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowMoreModal(false)
                    setSelectedDate(null)
                  }}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6 overflow-y-auto flex-1">
              <div className="space-y-2">
                {(() => {
                  const dateKey = format(selectedDate, "yyyy-MM-dd")
                  const dayTopics = topicsByDate[dateKey] || []
                  return dayTopics.map((topic) => (
                    <div
                      key={topic.id}
                      onClick={() => {
                        onTopicClick?.(topic)
                        setShowMoreModal(false)
                        setSelectedDate(null)
                      }}
                      className={`${getStatusColor(topic.status)} text-white p-3 rounded-lg cursor-pointer hover:opacity-90 transition-opacity`}
                    >
                      <div className="font-semibold text-sm sm:text-base mb-1">{topic.name}</div>
                      <div className="text-xs sm:text-sm opacity-90">
                        {topic.subject.name} - {topic.subject.grade}. Sınıf
                        {topic.subject.section && ` - ${topic.subject.section}`}
                      </div>
                      <div className="text-xs sm:text-sm opacity-80 mt-1">
                        Ünite: {topic.unit.name}
                      </div>
                      {topic.delayDays && topic.delayDays > 0 && (
                        <div className="text-xs sm:text-sm opacity-90 mt-1">
                          ⚠️ {topic.delayDays} gün gecikme
                        </div>
                      )}
                    </div>
                  ))
                })()}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Card>
  )
}
