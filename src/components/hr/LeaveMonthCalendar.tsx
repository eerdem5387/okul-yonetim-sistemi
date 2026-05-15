"use client"

import { useMemo } from "react"
import { Calendar, dateFnsLocalizer, Views, type Event } from "react-big-calendar"
import { format, parse, startOfWeek, getDay } from "date-fns"
import { tr } from "date-fns/locale"
import "react-big-calendar/lib/css/react-big-calendar.css"
import "./calendar-overrides.css"
import type { LeaveStatus, LeaveType } from "@prisma/client"
import { leaveTypeLabel } from "./hr-utils"

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
  day: "Gün",
  month: "Ay",
  previous: "Önceki",
  next: "Sonraki",
  today: "Bugün",
  agenda: "Ajanda",
  date: "Tarih",
  time: "Saat",
  event: "Olay",
  noEventsInRange: "Bu aralıkta izin yok.",
  showMore: (total: number) => `+${total} daha`,
}

export interface LeaveCalendarItem {
  id: string
  type: LeaveType
  status: LeaveStatus
  startDate: string | Date
  endDate: string | Date
  staffLabel?: string
}

interface LeaveMonthCalendarProps {
  items: LeaveCalendarItem[]
  height?: number
}

export function LeaveMonthCalendar({ items, height = 600 }: LeaveMonthCalendarProps) {
  const events = useMemo<Event[]>(
    () =>
      items.map((l) => {
        const start = typeof l.startDate === "string" ? new Date(l.startDate) : l.startDate
        const end = typeof l.endDate === "string" ? new Date(l.endDate) : l.endDate
        // RBC allDay end exclusive: bir günü kapsayacak şekilde +1 gün
        const inclusiveEnd = new Date(end)
        inclusiveEnd.setDate(inclusiveEnd.getDate() + 1)
        const title = l.staffLabel
          ? `${l.staffLabel} – ${leaveTypeLabel(l.type)}`
          : leaveTypeLabel(l.type)
        return {
          title,
          start,
          end: inclusiveEnd,
          allDay: true,
          resource: l,
        }
      }),
    [items]
  )

  return (
    <div className="rounded-xl border bg-white p-2" style={{ height }}>
      <Calendar
        localizer={localizer}
        culture="tr-TR"
        events={events}
        defaultView={Views.MONTH}
        views={[Views.MONTH, Views.AGENDA]}
        messages={messages}
        eventPropGetter={(event) => {
          const status = (event.resource as LeaveCalendarItem | undefined)?.status
          const cls =
            status === "APPROVED"
              ? "rbc-event-leave"
              : status === "REJECTED"
                ? "rbc-event-leave-rejected"
                : "rbc-event-leave-pending"
          return { className: cls }
        }}
        formats={{
          dayFormat: (date) => format(date, "EEE d", { locale: tr }),
          monthHeaderFormat: (date) => format(date, "LLLL yyyy", { locale: tr }),
        }}
        style={{ height: "100%" }}
      />
    </div>
  )
}
