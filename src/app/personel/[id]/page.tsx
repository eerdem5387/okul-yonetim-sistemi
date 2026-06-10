"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Shield,
  StickyNote,
  TrendingUp,
} from "lucide-react"
import type { LeaveStatus, LeaveType, StaffDepartment, StaffRetentionOutcome } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { WeeklyScheduleItem } from "@/components/hr/WeeklyScheduleCalendar"
import { LeaveMonthCalendar } from "@/components/hr/LeaveMonthCalendar"
import { LeaveRequestDialog } from "@/components/hr/LeaveRequestDialog"
import { LeaveApprovalRow, type LeaveItem } from "@/components/hr/LeaveApprovalRow"
import { AdminNotesEditor } from "@/components/hr/AdminNotesEditor"
import { StaffDashboardHeader, type StaffDashboardData } from "@/components/hr/StaffDashboardHeader"
import { StaffRetentionTimeline, type RetentionMeetingItem } from "@/components/hr/StaffRetentionTimeline"
import { StaffScheduleEditor } from "@/components/hr/StaffScheduleEditor"
import { RetentionOutcomeBadge } from "@/components/hr/RetentionOutcomeBadge"
import { DAY_OF_WEEK_LABELS } from "@/lib/hr/constants"
import {
  departmentLabel,
  formatDate,
  getAuthHeaders,
  isHrAdminClient,
} from "@/components/hr/hr-utils"
import {
  canEditHrRetention,
  canViewHrRetention,
  fetchPermissionsMe,
} from "@/lib/permissions/client"

interface StaffDetail {
  id: string
  firstName: string
  lastName: string
  tcNumber: string
  email: string | null
  phone: string | null
  department: StaffDepartment
  position: string | null
  subject: string | null
  isActive: boolean
  hireDate: string | null
}

interface ProgressSummary {
  subjectId: string
  subjectName: string
  grade: number
  section: string | null
  className: string | null
  totalTopics: number
  completedTopics: number
  percentage: number
}

interface DutyItem {
  id: string
  staffId: string
  dayOfWeek: number
  location: string
  notes: string | null
}

interface RetentionCycleData {
  id: string
  targetAcademicYearLabel: string
  currentOutcome: StaffRetentionOutcome | null
  lastMeetingAt: string | null
  meetings: RetentionMeetingItem[]
}

export default function StaffDetailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams<{ id: string }>()
  const staffId = params.id
  const initialTab = searchParams.get("tab") || "schedule"

  const [staff, setStaff] = useState<StaffDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [scheduleItems, setScheduleItems] = useState<WeeklyScheduleItem[]>([])
  const [leaves, setLeaves] = useState<LeaveItem[]>([])
  const [progress, setProgress] = useState<ProgressSummary[]>([])
  const [duties, setDuties] = useState<DutyItem[]>([])
  const [dashboardData, setDashboardData] = useState<StaffDashboardData | null>(null)
  const [retentionCycle, setRetentionCycle] = useState<RetentionCycleData | null>(null)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)
  const [activeTab, setActiveTab] = useState(initialTab)

  const [isAdmin, setIsAdmin] = useState(false)
  const [isSelf, setIsSelf] = useState(false)
  const [canEditRetention, setCanEditRetention] = useState(false)
  const [canViewRetention, setCanViewRetention] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    setIsAdmin(isHrAdminClient())
    const me = localStorage.getItem("staff_id")
    setIsSelf(me === staffId)
    fetchPermissionsMe().then((perms) => {
      setCanViewRetention(canViewHrRetention(perms))
      setCanEditRetention(canEditHrRetention(perms))
    })
  }, [staffId])

  const loadStaff = useCallback(async () => {
    const res = await fetch(`/api/staff/${staffId}`, { headers: getAuthHeaders(), cache: "no-store" })
    if (res.ok) {
      const data = await res.json()
      setStaff(data.staff || data)
    }
  }, [staffId])

  const loadSchedule = useCallback(async () => {
    const res = await fetch(`/api/hr/staff/${staffId}/schedule`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    })
    if (res.ok) {
      const data = await res.json()
      setScheduleItems(data.items || [])
    }
  }, [staffId])

  const loadLeaves = useCallback(async () => {
    const res = await fetch(`/api/hr/leaves?staffId=${staffId}`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    })
    if (res.ok) {
      const data = await res.json()
      setLeaves(data.leaves || [])
    }
  }, [staffId])

  const loadProgress = useCallback(async () => {
    const res = await fetch(`/api/hr/staff/${staffId}/progress`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    })
    if (res.ok) {
      const data = await res.json()
      setProgress(data.summary || [])
    }
  }, [staffId])

  const loadDuties = useCallback(async () => {
    const res = await fetch(`/api/hr/duties?staffId=${staffId}`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    })
    if (res.ok) {
      const data = await res.json()
      setDuties(data.duties || [])
    }
  }, [staffId])

  const loadDashboard = useCallback(async () => {
    const res = await fetch(`/api/hr/staff/${staffId}/dashboard`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    })
    if (res.ok) {
      const data = await res.json()
      setDashboardData({
        leaves: data.leaves,
        schedule: data.schedule,
        retention: data.retention,
      })
    }
  }, [staffId])

  const loadRetention = useCallback(async () => {
    if (!canViewRetention && !isAdmin) return
    const res = await fetch(`/api/hr/retention/cycles?staffId=${staffId}`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    })
    if (res.ok) {
      const data = await res.json()
      setRetentionCycle(data.cycle ?? null)
    }
  }, [staffId, canViewRetention, isAdmin])

  useEffect(() => {
    if (!staffId) return
    setLoading(true)
    Promise.all([
      loadStaff(),
      loadSchedule(),
      loadLeaves(),
      loadProgress(),
      loadDuties(),
      loadDashboard(),
    ]).finally(() => setLoading(false))
  }, [staffId, loadStaff, loadSchedule, loadLeaves, loadProgress, loadDuties, loadDashboard])

  useEffect(() => {
    if (canViewRetention || isAdmin) void loadRetention()
  }, [canViewRetention, isAdmin, loadRetention])

  const leaveCalendarItems = useMemo(
    () =>
      leaves.map((l) => ({
        id: l.id,
        type: l.type as LeaveType,
        status: l.status as LeaveStatus,
        startDate: l.startDate,
        endDate: l.endDate,
      })),
    [leaves]
  )

  const groupedDuties = useMemo(() => {
    const out: Record<number, DutyItem[]> = {}
    for (const d of duties) {
      out[d.dayOfWeek] = out[d.dayOfWeek] || []
      out[d.dayOfWeek].push(d)
    }
    return out
  }, [duties])

  const showRetentionTab = isAdmin || canViewRetention
  const canEditSchedule = isAdmin

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!staff) {
    return (
      <div className="px-6 py-10 text-center text-gray-500">
        Personel bulunamadı.
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => router.push("/personel")}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Personel Listesi
        </Button>
        {(isSelf || isAdmin) && (
          <Button size="sm" onClick={() => setShowLeaveDialog(true)}>
            Yeni İzin Talebi
          </Button>
        )}
      </div>

      <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-2xl font-bold text-white shadow-md">
            {staff.firstName[0]}
            {staff.lastName[0]}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {staff.firstName} {staff.lastName}
            </h1>
            <p className="text-sm text-gray-600">
              {departmentLabel(staff.department)}
              {staff.position ? ` · ${staff.position}` : ""}
              {staff.subject ? ` · ${staff.subject}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
              {staff.email && (
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" /> {staff.email}
                </span>
              )}
              {staff.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" /> {staff.phone}
                </span>
              )}
              {staff.hireDate && (
                <span className="inline-flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5" /> İşe başlama: {formatDate(staff.hireDate)}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${staff.isActive ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200" : "bg-gray-100 text-gray-600 ring-1 ring-gray-200"}`}
            >
              {staff.isActive ? "Aktif" : "Pasif"}
            </span>
            {dashboardData && (
              <RetentionOutcomeBadge outcome={dashboardData.retention.currentOutcome} />
            )}
          </div>
        </div>
      </div>

      {dashboardData && (isAdmin || canViewRetention) && (
        <div className="mb-6">
          <StaffDashboardHeader data={dashboardData} />
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="schedule">
            <CalendarDays className="mr-1.5 h-4 w-4" />
            Ders Programı
          </TabsTrigger>
          <TabsTrigger value="leaves">
            <CalendarRange className="mr-1.5 h-4 w-4" />
            İzinler
          </TabsTrigger>
          {showRetentionTab && (
            <TabsTrigger value="retention">
              <MessageSquare className="mr-1.5 h-4 w-4" />
              Yıl Sonu Görüşmeleri
            </TabsTrigger>
          )}
          <TabsTrigger value="progress">
            <TrendingUp className="mr-1.5 h-4 w-4" />
            Müfredat İlerleme
          </TabsTrigger>
          <TabsTrigger value="duties">
            <Shield className="mr-1.5 h-4 w-4" />
            Nöbet
          </TabsTrigger>
          <TabsTrigger value="info">
            <ClipboardList className="mr-1.5 h-4 w-4" />
            Genel Bilgiler
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="admin-notes">
              <StickyNote className="mr-1.5 h-4 w-4" />
              Yönetici Notları
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="schedule">
          <StaffScheduleEditor
            staffId={staffId}
            canEdit={canEditSchedule}
            items={scheduleItems}
            onChanged={() => {
              void loadSchedule()
              void loadDashboard()
            }}
          />
        </TabsContent>

        <TabsContent value="leaves" className="space-y-4">
          <LeaveMonthCalendar items={leaveCalendarItems} height={480} />
          <div className="space-y-2">
            {leaves.length === 0 && <EmptyState>Henüz izin kaydı yok.</EmptyState>}
            {leaves.map((l) => (
              <LeaveApprovalRow
                key={l.id}
                leave={l}
                isAdmin={isAdmin}
                onChanged={() => {
                  void loadLeaves()
                  void loadDashboard()
                }}
                showStaffName={false}
              />
            ))}
          </div>
        </TabsContent>

        {showRetentionTab && (
          <TabsContent value="retention">
            <StaffRetentionTimeline
              staffId={staffId}
              staffName={`${staff.firstName} ${staff.lastName}`}
              targetYearLabel={retentionCycle?.targetAcademicYearLabel ?? dashboardData?.retention.targetAcademicYearLabel ?? null}
              meetings={retentionCycle?.meetings ?? []}
              canEdit={canEditRetention || isAdmin}
              onChanged={() => {
                void loadRetention()
                void loadDashboard()
              }}
              onStaffRemoved={() => router.push("/personel")}
            />
          </TabsContent>
        )}

        <TabsContent value="progress">
          {progress.length === 0 ? (
            <EmptyState>
              Bu personele tanımlı ders ataması yok ya da henüz konu eklenmemiş.
            </EmptyState>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {progress.map((p) => (
                <div
                  key={p.subjectId}
                  className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {p.subjectName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {p.grade}. Sınıf
                        {p.section ? ` · ${p.section}` : ""}
                        {p.className ? ` · ${p.className}` : ""}
                      </p>
                    </div>
                    <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">
                      %{p.percentage}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all"
                      style={{ width: `${Math.min(100, p.percentage)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {p.completedTopics} / {p.totalTopics} konu tamamlandı
                  </p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="duties">
          {duties.length === 0 ? (
            <EmptyState>Bu personel için tanımlı nöbet yok.</EmptyState>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <div
                  key={day}
                  className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm"
                >
                  <h3 className="mb-2 text-sm font-semibold text-gray-900">
                    {DAY_OF_WEEK_LABELS[day]}
                  </h3>
                  {(groupedDuties[day] || []).length === 0 ? (
                    <p className="text-xs text-gray-400">—</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {(groupedDuties[day] || []).map((d) => (
                        <li
                          key={d.id}
                          className="flex items-start gap-1.5 rounded-md bg-blue-50/40 px-2 py-1 text-sm"
                        >
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
                          <div>
                            <div className="font-medium text-gray-800">{d.location}</div>
                            {d.notes && <div className="text-xs italic text-gray-500">{d.notes}</div>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="info">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="TC Kimlik No" value={staff.tcNumber} />
            <Field label="Bölüm" value={departmentLabel(staff.department)} />
            <Field label="Pozisyon" value={staff.position} />
            <Field label="Branş" value={staff.subject} />
            <Field label="E-posta" value={staff.email} />
            <Field label="Telefon" value={staff.phone} />
            <Field label="İşe Başlama" value={staff.hireDate ? formatDate(staff.hireDate) : null} />
            <Field label="Durum" value={staff.isActive ? "Aktif" : "Pasif"} />
          </div>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="admin-notes">
            <AdminNotesEditor staffId={staff.id} />
          </TabsContent>
        )}
      </Tabs>

      <LeaveRequestDialog
        open={showLeaveDialog}
        onOpenChange={setShowLeaveDialog}
        staffId={isAdmin && !isSelf ? staffId : undefined}
        onCreated={loadLeaves}
      />
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-sm text-gray-900">{value || "—"}</p>
    </div>
  )
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
      {children}
    </div>
  )
}
