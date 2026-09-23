"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Clock, School, Loader2 } from "lucide-react"
import { TeacherScheduleGrid } from "@/components/schedules/teacher-schedule-grid"
import {
  DEFAULT_LESSON_SLOTS,
  DEFAULT_SATURDAY_SLOTS,
  type LessonSlot,
} from "@/lib/schedules/lesson-slots"
import type { SlotKind } from "@/lib/schedules/day-templates"

interface Schedule {
  id: string
  subjectName: string
  dayOfWeek: number
  startTime: string
  endTime: string
  room: string | null
  class: {
    id: string
    name: string
    grade: number
    section: string
  }
}

type SlotRow = LessonSlot & { kind?: SlotKind; band?: "ortaokul" | "lise" }

export default function TeacherSchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [weekdaySlots, setWeekdaySlots] = useState<SlotRow[]>(DEFAULT_LESSON_SLOTS)
  const [saturdaySlots, setSaturdaySlots] = useState<SlotRow[]>(DEFAULT_SATURDAY_SLOTS)

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/schedules/day-templates?band=all&scope=both", {
        cache: "no-store",
      })
      if (!res.ok) return
      const data = await res.json()
      const templates = Array.isArray(data.templates) ? data.templates : []
      const weekdayMap = new Map<string, SlotRow>()
      const saturdayMap = new Map<string, SlotRow>()
      for (const t of templates) {
        const rows = Array.isArray(t.slots) ? t.slots : []
        const band = t.band === "lise" ? ("lise" as const) : ("ortaokul" as const)
        const target = t.scope === "saturday" ? saturdayMap : weekdayMap
        for (const s of rows) {
          if ((s.kind ?? "LESSON") === "ETUT") continue
          if (!target.has(s.startTime)) {
            target.set(s.startTime, { ...s, band })
          }
        }
      }
      if (weekdayMap.size > 0) {
        setWeekdaySlots(
          [...weekdayMap.values()].sort((a, b) => a.startTime.localeCompare(b.startTime))
        )
      }
      if (saturdayMap.size > 0) {
        setSaturdaySlots(
          [...saturdayMap.values()].sort((a, b) => a.startTime.localeCompare(b.startTime))
        )
      }
    } catch {
      /* keep defaults */
    }
  }, [])

  const fetchSchedule = useCallback(async (teacherId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/schedules/teacher?teacherId=${teacherId}`)
      if (response.ok) {
        const data = await response.json()
        setSchedules(data.schedules || [])
      }
    } catch (error) {
      console.error("Error fetching schedule:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTemplates()
    if (typeof window !== "undefined") {
      const teacherId = localStorage.getItem("staff_id")
      if (teacherId) {
        void fetchSchedule(teacherId)
      } else {
        setLoading(false)
      }
    }
  }, [fetchSchedule, loadTemplates])

  const items = useMemo(
    () =>
      schedules.map((s) => ({
        id: s.id,
        subjectName: s.subjectName,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        room: s.room,
        className: s.class.name,
        kind: "class" as const,
      })),
    [schedules]
  )

  const totalHours = schedules.length
  const uniqueClasses = new Set(schedules.map((s) => s.class.id)).size
  const uniqueSubjects = new Set(schedules.map((s) => s.subjectName)).size

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Calendar className="h-7 w-7 text-blue-600" />
            Haftalık Ders Programım
          </h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            Size atanmış haftalık ders programınızı görüntüleyin.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Toplam Ders Saati</p>
                  <p className="text-2xl font-bold text-blue-600">{totalHours}</p>
                </div>
                <Clock className="h-10 w-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Sınıf Sayısı</p>
                  <p className="text-2xl font-bold text-green-600">{uniqueClasses}</p>
                </div>
                <School className="h-10 w-10 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Ders Sayısı</p>
                  <p className="text-2xl font-bold text-purple-600">{uniqueSubjects}</p>
                </div>
                <Calendar className="h-10 w-10 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Haftalık program</CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="py-12 text-center">
                <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Henüz ders programınız oluşturulmamış
                </h3>
                <p className="text-gray-600">
                  Okul yönetimi tarafından ders programınız atandığında burada görünecektir.
                </p>
              </div>
            ) : (
              <TeacherScheduleGrid
                items={items}
                weekdaySlots={weekdaySlots}
                saturdaySlots={saturdaySlots}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
