"use client"

import {
  AlertTriangle,
  CalendarOff,
  CalendarRange,
  ClipboardCheck,
  FileWarning,
  GraduationCap,
  Megaphone,
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
  officialNotices?: {
    ihtar: number
    talimat: number
    personelDuyurusu: number
    total: number
    unseen: number
  }
}

export function StaffDashboardHeader({ data }: { data: StaffDashboardData }) {
  const notices = data.officialNotices ?? {
    ihtar: 0,
    talimat: 0,
    personelDuyurusu: 0,
    total: 0,
    unseen: 0,
  }

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

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Resmi iç haberleşme
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <HrStatCard
            label="İhtar"
            value={notices.ihtar}
            icon={AlertTriangle}
            tone="rose"
            hint="Bu personele gönderilen ihtarlar"
          />
          <HrStatCard
            label="Talimat"
            value={notices.talimat}
            icon={FileWarning}
            tone="amber"
            hint="Bu personele gönderilen talimatlar"
          />
          <HrStatCard
            label="Personel duyurusu"
            value={notices.personelDuyurusu}
            icon={Megaphone}
            tone="blue"
            hint="Bu personele gönderilen duyurular"
          />
          <HrStatCard
            label="Toplam resmi ileti"
            value={notices.total}
            icon={MessageSquare}
            tone="emerald"
            hint={
              notices.unseen > 0
                ? `${notices.unseen} henüz görülmedi`
                : notices.total > 0
                  ? "Tümü görüldü"
                  : "Kayıt yok"
            }
          />
        </div>
      </div>
    </div>
  )
}
