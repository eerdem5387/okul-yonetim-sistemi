"use client"

import { useMemo } from "react"
import { Calendar, dateFnsLocalizer, Views, type Event } from "react-big-calendar"
import { format, parse, startOfWeek, getDay } from "date-fns"
import { tr } from "date-fns/locale"
import "react-big-calendar/lib/css/react-big-calendar.css"
import "./calendar-overrides.css"

const locales = { "tr-TR": tr }

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales,
})

const messages = {
  week: "Hafta",
  work_week: "Çalışma Haftası",
  day: "Gün",
  month: "Ay",
  previous: "Önceki",
  next: "Sonraki",
  today: "Bugün",
  agenda: "Ajanda",
  date: "Tarih",
  time: "Saat",
  event: "Olay",
  noEventsInRange: "Bu aralıkta etkinlik yok.",
  showMore: (total: number) => `+${total} daha`,
}

export interface WeeklyScheduleItem {
  id: string
  classId: string
  className: string
  subjectName: string
  dayOfWeek: number // 1-7 (Pazartesi-Pazar)
  startTime: string // "HH:mm"
  endTime: string // "HH:mm"
  room: string | null
}

interface WeeklyScheduleCalendarProps {
  items: WeeklyScheduleItem[]
  height?: number
}

function buildEventForCurrentWeek(item: WeeklyScheduleItem): Event {
  const today = new Date()
  const monday = startOfWeek(today, { weekStartsOn: 1 })
  const target = new Date(monday)
  target.setDate(monday.getDate() + (item.dayOfWeek - 1))

  const [sh, sm] = item.startTime.split(":").map((s) => Number(s))
  const [eh, em] = item.endTime.split(":").map((s) => Number(s))
  const start = new Date(target)
  start.setHours(sh || 0, sm || 0, 0, 0)
  const end = new Date(target)
  end.setHours(eh || 0, em || 0, 0, 0)

  return {
    title: `${item.subjectName} • ${item.className}${item.room ? ` (${item.room})` : ""}`,
    start,
    end,
    resource: item,
  }
}

export function WeeklyScheduleCalendar({ items, height = 620 }: WeeklyScheduleCalendarProps) {
  const events = useMemo(() => items.map(buildEventForCurrentWeek), [items])

  return (
    <div className="rounded-xl border bg-white p-2" style={{ height }}>
      <Calendar
        localizer={localizer}
        culture="tr-TR"
        events={events}
        defaultView={Views.WEEK}
        views={[Views.WEEK, Views.DAY, Views.AGENDA]}
        step={30}
        timeslots={2}
        min={new Date(1970, 0, 1, 7, 0)}
        max={new Date(1970, 0, 1, 19, 0)}
        messages={messages}
        formats={{
          timeGutterFormat: "HH:mm",
          eventTimeRangeFormat: ({ start, end }) =>
            `${format(start, "HH:mm")} - ${format(end, "HH:mm")}`,
          dayFormat: (date) => format(date, "EEEE", { locale: tr }),
        }}
        style={{ height: "100%" }}
      />
    </div>
  )
}
