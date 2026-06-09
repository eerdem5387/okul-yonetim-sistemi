"use client"

import {
  CalendarOff,
  CalendarRange,
  ClipboardCheck,
  GraduationCap,
  MessageSquare,
  Stethoscope,
} from "lucide-react"
import type { StaffRetentionOutcome } from "@prisma/client"
import { HrStatCard } from "./HrStatCard"
import { RetentionOutcomeBadge } from "./RetentionOutcomeBadge"

export interface StaffDashboardData {
  leaves: {
    reportedDays: number
    nonReportedDays: number
    totalApprovedDays: number
    pendingCount: number
  }
  schedule: {
    weeklyLessonCount: number
    weeklyTeachingDays: number
    weeklyHours: number
  }
  retention: {
    targetAcademicYearLabel: string | null
    currentOutcome: StaffRetentionOutcome | null
    meetingCount: number
  }
}

export function StaffDashboardHeader({ data }: { data: StaffDashboardData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <HrStatCard
          label="Raporlu İzin (Sağlık Raporu)"
          value={`${data.leaves.reportedDays} gün`}
          icon={Stethoscope}
          tone="rose"
          hint="Onaylı sağlık raporu izinleri"
        />
        <HrStatCard
          label="Raporsuz İzin"
          value={`${data.leaves.nonReportedDays} gün`}
          icon={CalendarRange}
          tone="amber"
          hint="Yıllık, mazeret, ücretsiz ve saatlik izinler"
        />
        <HrStatCard
          label="Toplam Onaylı İzin"
          value={`${data.leaves.totalApprovedDays} gün`}
          icon={CalendarOff}
          tone="blue"
          hint={
            data.leaves.pendingCount > 0
              ? `${data.leaves.pendingCount} bekleyen talep`
              : "Bekleyen talep yok"
          }
        />
        {data.schedule.weeklyLessonCount > 0 && (
          <HrStatCard
            label="Haftalık Ders Yükü"
            value={`${data.schedule.weeklyLessonCount} ders`}
            icon={GraduationCap}
            tone="emerald"
            hint={`${data.schedule.weeklyTeachingDays} gün · ~${data.schedule.weeklyHours} saat`}
          />
        )}
        <HrStatCard
          label="Yıl Sonu Devam Durumu"
          value={
            data.retention.currentOutcome ? (
              <RetentionOutcomeBadge outcome={data.retention.currentOutcome} />
            ) : (
              "Görüşme Yapılmadı"
            )
          }
          icon={MessageSquare}
          tone="blue"
          hint={
            data.retention.targetAcademicYearLabel
              ? `${data.retention.targetAcademicYearLabel} · ${data.retention.meetingCount} görüşme`
              : undefined
          }
        />
        {data.leaves.pendingCount > 0 && (
          <HrStatCard
            label="Bekleyen İzin Talebi"
            value={data.leaves.pendingCount}
            icon={ClipboardCheck}
            tone="amber"
          />
        )}
      </div>
    </div>
  )
}
