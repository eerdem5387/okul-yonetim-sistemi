"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  Award,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  ExternalLink,
  GraduationCap,
  Loader2,
  MapPin,
  MessageSquare,
  Pencil,
  Phone,
  Save,
  School,
  TrendingDown,
  TrendingUp,
  User,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface DashboardData {
  student: {
    id: string
    firstName: string
    lastName: string
    grade: string
    tcNumber: string
    phone?: string | null
    email?: string | null
  }
  statistics: {
    homeworkCompletionRate: number
    totalHomeworks: number
    completedHomeworks: number
    pendingHomeworks: number
    attendanceRate: number
    totalAttendances: number
    presentCount: number
    absentCount: number
    lateCount: number
    excusedCount: number
    averageScore: number
    totalExams: number
    totalComments: number
    positiveComments: number
    negativeComments: number
    totalActivities: number
    verifiedActivities: number
  }
  recentData: {
    homeworks: Array<{
      id: string
      isCompleted: boolean
      completedAt: string | null
      homework: {
        title: string
        dueDate: string
        subject: string | null
        teacher: { firstName: string; lastName: string }
      }
    }>
    attendances: Array<{
      id: string
      status: string
      date: string
      lessonName: string
      teacher: { firstName: string; lastName: string }
    }>
    examResults: Array<{
      id: string
      totalScore: number | null
      ranking: number | null
      exam: {
        id: string
        name: string
        examType: string
        examDate: string
        class?: { name: string }
      }
    }>
    comments: Array<{
      id: string
      commentType: string
      category: string | null
      content: string
      isPositive: boolean
      createdAt: string
      staff: { firstName: string; lastName: string; department: string }
    }>
    activities: Array<{
      id: string
      type: string
      title: string
      description: string | null
      activityDate: string
      location: string | null
      isVerified: boolean
    }>
  }
}

interface ProfileData {
  student: {
    id: string
    firstName: string
    lastName: string
    tcNumber: string
    birthDate: string
    grade: string
    phone: string | null
    email: string | null
    address: string
    motherName: string
    motherTc: string
    motherPhone: string
    motherAddress: string
    motherOccupation: string
    fatherName: string
    fatherTc: string
    fatherPhone: string
    fatherAddress: string
    fatherOccupation: string
    announcedTuitionFee: string | null
    studentTuitionFee: string | null
    bookPaymentPaid: boolean | null
    registrationStatusText: string
    registrationStatusOverride: string | null
  }
  classAssignments: Array<{
    id: string
    assignedAt: string
    class: {
      id: string
      name: string
      grade: number
      section: string
      academicYear: { id: string; name: string; isActive: boolean }
      counselor: { id: string; firstName: string; lastName: string } | null
    }
  }>
  renewals: Array<{ id: string; createdAt: string; contractData: unknown }>
  newRegistrations: Array<{ id: string; createdAt: string; contractData: unknown }>
  contracts: {
    uniform: Array<{ id: string; createdAt: string }>
    meal: Array<{ id: string; createdAt: string }>
    service: Array<{ id: string; createdAt: string }>
    book: Array<{ id: string; createdAt: string }>
  }
  clubSelections: Array<{
    id: string
    club: { id: string; name: string; capacity: number }
  }>
  parentMeetings: Array<{
    id: string
    meetingDate: string
    notes: string | null
    counselorName: string | null
  }>
  parentLinks: Array<{
    id: string
    relation: string
    parentName: string
    parentPhone: string | null
    parentEmail: string | null
  }>
}

const TAB_IDS = [
  "overview",
  "profile",
  "registration",
  "homework",
  "attendance",
  "exams",
  "comments",
  "activities",
  "clubs",
  "meetings",
] as const

type TabId = (typeof TAB_IDS)[number]

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—"
  const d = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("tr-TR")
}

function attendanceLabel(status: string) {
  switch (status) {
    case "PRESENT":
      return "Geldi"
    case "ABSENT":
      return "Gelmedi"
    case "LATE":
      return "Geç kaldı"
    case "EXCUSED":
      return "İzinli"
    default:
      return status
  }
}

function attendanceClass(status: string) {
  switch (status) {
    case "PRESENT":
      return "bg-green-100 text-green-700"
    case "ABSENT":
      return "bg-red-100 text-red-700"
    case "LATE":
      return "bg-orange-100 text-orange-700"
    case "EXCUSED":
      return "bg-blue-100 text-blue-700"
    default:
      return "bg-gray-100 text-gray-700"
  }
}

function registrationBadgeClass(text: string) {
  if (text.includes("Yeni Kayıt")) return "bg-emerald-100 text-emerald-800"
  if (text.includes("yenilendi")) return "bg-blue-100 text-blue-800"
  if (text.includes("yenilenmedi")) return "bg-amber-100 text-amber-800"
  return "bg-gray-100 text-gray-700"
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-gray-900 break-words">{value || "—"}</p>
    </div>
  )
}

export default function StudentDetailDashboardPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const studentId = params.id
  const initialTab = (searchParams.get("tab") as TabId) || "overview"

  const [activeTab, setActiveTab] = useState<TabId>(
    TAB_IDS.includes(initialTab) ? initialTab : "overview"
  )
  const [period, setPeriod] = useState("all")
  const [loading, setLoading] = useState(true)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState<Record<string, string>>({})

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [dashRes, profileRes] = await Promise.all([
        fetch(`/api/students/${studentId}/dashboard?period=${period}`),
        fetch(`/api/students/${studentId}/profile`),
      ])
      if (dashRes.ok) setDashboard(await dashRes.json())
      if (profileRes.ok) {
        const data = (await profileRes.json()) as ProfileData
        setProfile(data)
        const s = data.student
        setEditForm({
          firstName: s.firstName,
          lastName: s.lastName,
          tcNumber: s.tcNumber,
          birthDate: s.birthDate ? new Date(s.birthDate).toISOString().split("T")[0] : "",
          grade: s.grade,
          phone: s.phone || "",
          email: s.email || "",
          address: s.address,
          motherName: s.motherName,
          motherTc: s.motherTc,
          motherPhone: s.motherPhone,
          motherAddress: s.motherAddress,
          motherOccupation: s.motherOccupation,
          fatherName: s.fatherName,
          fatherTc: s.fatherTc,
          fatherPhone: s.fatherPhone,
          fatherAddress: s.fatherAddress,
          fatherOccupation: s.fatherOccupation,
          announcedTuitionFee: s.announcedTuitionFee || "",
          studentTuitionFee: s.studentTuitionFee || "",
          bookPaymentPaid:
            s.bookPaymentPaid === true ? "true" : s.bookPaymentPaid === false ? "false" : "",
        })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [studentId, period])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleTabChange = (tab: string) => {
    const next = tab as TabId
    setActiveTab(next)
    router.replace(`/students/${studentId}?tab=${next}`, { scroll: false })
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const role = typeof window !== "undefined" ? localStorage.getItem("auth_role") : null
      const res = await fetch(`/api/students/${studentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(role ? { "x-user-role": role } : {}),
        },
        body: JSON.stringify({
          ...editForm,
          bookPaymentPaid:
            editForm.bookPaymentPaid === ""
              ? null
              : editForm.bookPaymentPaid === "true",
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setEditMode(false)
        await loadData()
        alert("Profil güncellendi.")
      } else {
        alert(data.error || "Profil güncellenemedi.")
      }
    } catch (e) {
      console.error(e)
      alert("Profil güncellenemedi.")
    } finally {
      setSaving(false)
    }
  }

  if (loading && !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <p className="text-gray-600">Öğrenci bulunamadı.</p>
        <Button onClick={() => router.push("/students")}>Öğrenci listesine dön</Button>
      </div>
    )
  }

  const { student } = profile
  const activeClass =
    profile.classAssignments.find((a) => a.class.academicYear.isActive) ??
    profile.classAssignments[0]

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-white">
        <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8">
          <Button variant="ghost" size="sm" className="mb-3" onClick={() => router.push("/students")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Öğrenci Yönetimi
          </Button>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-2xl font-bold text-white">
                {student.firstName.charAt(0)}
                {student.lastName.charAt(0)}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                  {student.firstName} {student.lastName}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                  <span className="rounded-md bg-blue-50 px-2 py-1 font-medium text-blue-700">
                    {student.grade}
                  </span>
                  {activeClass && (
                    <Link
                      href={`/sinif-yonetimi/${activeClass.class.id}`}
                      className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-1 font-medium text-purple-700 hover:bg-purple-100"
                    >
                      <School className="h-3.5 w-3.5" />
                      {activeClass.class.name}
                    </Link>
                  )}
                  <span className="text-gray-500">TC: {student.tcNumber}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium",
                      registrationBadgeClass(student.registrationStatusText)
                    )}
                  >
                    {student.registrationStatusText}
                  </span>
                  {activeClass?.class.counselor && (
                    <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-800">
                      Rehber: {activeClass.class.counselor.firstName}{" "}
                      {activeClass.class.counselor.lastName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                <option value="30days">Son 30 gün</option>
                <option value="thisMonth">Bu ay</option>
                <option value="all">Tümü</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveTab("profile")
                  setEditMode(true)
                  router.replace(`/students/${studentId}?tab=profile`, { scroll: false })
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Profili düzenle
              </Button>
              <Link href={`/faaliyet-yonetimi/ogrenci/${studentId}`}>
                <Button variant="outline" size="sm" type="button">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Faaliyet detayı
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mb-6 h-auto w-full flex-wrap justify-start gap-1 bg-white p-1">
            <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
            <TabsTrigger value="profile">Profil & Aile</TabsTrigger>
            <TabsTrigger value="registration">Kayıt & Sözleşmeler</TabsTrigger>
            <TabsTrigger value="homework">Ödevler</TabsTrigger>
            <TabsTrigger value="attendance">Yoklama</TabsTrigger>
            <TabsTrigger value="exams">Sınavlar</TabsTrigger>
            <TabsTrigger value="comments">Görüşler</TabsTrigger>
            <TabsTrigger value="activities">Faaliyetler</TabsTrigger>
            <TabsTrigger value="clubs">Kulüpler</TabsTrigger>
            <TabsTrigger value="meetings">Veli Görüşmeleri</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {dashboard && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-5">
                      <p className="text-sm text-gray-600">Ödev tamamlama</p>
                      <p className="text-3xl font-bold">%{dashboard.statistics.homeworkCompletionRate}</p>
                      <p className="text-xs text-gray-500">
                        {dashboard.statistics.completedHomeworks}/{dashboard.statistics.totalHomeworks}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-green-500">
                    <CardContent className="p-5">
                      <p className="text-sm text-gray-600">Devam oranı</p>
                      <p className="text-3xl font-bold">%{dashboard.statistics.attendanceRate}</p>
                      <p className="text-xs text-gray-500">
                        {dashboard.statistics.presentCount}/{dashboard.statistics.totalAttendances} geldi
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-purple-500">
                    <CardContent className="p-5">
                      <p className="text-sm text-gray-600">Sınav ortalaması</p>
                      <p className="text-3xl font-bold">{dashboard.statistics.averageScore}</p>
                      <p className="text-xs text-gray-500">{dashboard.statistics.totalExams} sınav</p>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-orange-500">
                    <CardContent className="p-5">
                      <p className="text-sm text-gray-600">Görüşler</p>
                      <p className="text-3xl font-bold">{dashboard.statistics.totalComments}</p>
                      <p className="text-xs text-gray-500">
                        {dashboard.statistics.positiveComments} olumlu · {dashboard.statistics.negativeComments} gelişmeli
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-violet-500">
                    <CardContent className="p-5">
                      <p className="text-sm text-gray-600">IB faaliyetleri</p>
                      <p className="text-3xl font-bold">{dashboard.statistics.totalActivities}</p>
                      <p className="text-xs text-gray-500">
                        {dashboard.statistics.verifiedActivities} doğrulanmış
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <BookOpen className="h-4 w-4 text-blue-600" />
                        Son ödevler
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {dashboard.recentData.homeworks.length === 0 ? (
                        <p className="text-sm text-gray-500">Kayıt yok</p>
                      ) : (
                        dashboard.recentData.homeworks.slice(0, 5).map((hw) => (
                          <div key={hw.id} className="rounded-lg border p-3 text-sm">
                            <p className="font-medium">{hw.homework.title}</p>
                            <p className="text-xs text-gray-500">
                              {hw.homework.subject} · Teslim: {formatDate(hw.homework.dueDate)}
                            </p>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <MessageSquare className="h-4 w-4 text-orange-600" />
                        Son görüşler
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {dashboard.recentData.comments.length === 0 ? (
                        <p className="text-sm text-gray-500">Kayıt yok</p>
                      ) : (
                        dashboard.recentData.comments.slice(0, 5).map((c) => (
                          <div key={c.id} className="rounded-lg border p-3 text-sm">
                            <div className="mb-1 flex items-center gap-2">
                              {c.isPositive ? (
                                <TrendingUp className="h-4 w-4 text-green-600" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-red-600" />
                              )}
                              <span className="font-medium">
                                {c.staff.firstName} {c.staff.lastName}
                              </span>
                            </div>
                            <p className="line-clamp-2 text-gray-600">{c.content}</p>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <div className="flex justify-end">
              <Button
                variant={editMode ? "outline" : "default"}
                size="sm"
                onClick={() => setEditMode((v) => !v)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                {editMode ? "Düzenlemeyi iptal et" : "Düzenle"}
              </Button>
            </div>

            {editMode ? (
              <Card>
                <CardHeader>
                  <CardTitle>Profil düzenle</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {[
                    ["firstName", "Ad"],
                    ["lastName", "Soyad"],
                    ["tcNumber", "TC Kimlik No"],
                    ["birthDate", "Doğum tarihi"],
                    ["grade", "Sınıf"],
                    ["phone", "Telefon"],
                    ["email", "E-posta"],
                    ["address", "Adres"],
                    ["motherName", "Anne adı"],
                    ["motherPhone", "Anne telefon"],
                    ["fatherName", "Baba adı"],
                    ["fatherPhone", "Baba telefon"],
                    ["announcedTuitionFee", "İlan edilen ücret"],
                    ["studentTuitionFee", "Öğrenci ücreti"],
                  ].map(([key, label]) => (
                    <div key={key} className="space-y-1">
                      <Label htmlFor={key}>{label}</Label>
                      <Input
                        id={key}
                        type={key === "birthDate" ? "date" : "text"}
                        value={editForm[key] || ""}
                        onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                      />
                    </div>
                  ))}
                  <div className="space-y-1">
                    <Label htmlFor="bookPaymentPaid">Kitap ödemesi</Label>
                    <select
                      id="bookPaymentPaid"
                      className="w-full rounded-md border px-3 py-2 text-sm"
                      value={editForm.bookPaymentPaid}
                      onChange={(e) => setEditForm((f) => ({ ...f, bookPaymentPaid: e.target.value }))}
                    >
                      <option value="">Belirtilmemiş</option>
                      <option value="true">Alındı</option>
                      <option value="false">Alınmadı</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 flex gap-2 pt-2">
                    <Button onClick={handleSaveProfile} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Kaydet
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Öğrenci bilgileri
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <InfoRow label="Ad Soyad" value={`${student.firstName} ${student.lastName}`} />
                    <InfoRow label="TC" value={student.tcNumber} />
                    <InfoRow label="Doğum tarihi" value={formatDate(student.birthDate)} />
                    <InfoRow label="Sınıf (kart)" value={student.grade} />
                    <InfoRow label="Telefon" value={student.phone} />
                    <InfoRow label="E-posta" value={student.email} />
                    <InfoRow label="Adres" value={student.address} />
                    <InfoRow
                      label="Kitap ödemesi"
                      value={
                        student.bookPaymentPaid === true
                          ? "Alındı"
                          : student.bookPaymentPaid === false
                            ? "Alınmadı"
                            : "Belirtilmemiş"
                      }
                    />
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Anne bilgileri</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <InfoRow label="Ad Soyad" value={student.motherName} />
                      <InfoRow label="TC" value={student.motherTc} />
                      <InfoRow label="Telefon" value={student.motherPhone} />
                      <InfoRow label="Meslek" value={student.motherOccupation} />
                      <InfoRow label="Adres" value={student.motherAddress} />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Baba bilgileri</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <InfoRow label="Ad Soyad" value={student.fatherName} />
                      <InfoRow label="TC" value={student.fatherTc} />
                      <InfoRow label="Telefon" value={student.fatherPhone} />
                      <InfoRow label="Meslek" value={student.fatherOccupation} />
                      <InfoRow label="Adres" value={student.fatherAddress} />
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" />
                      Sınıf atamaları
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {profile.classAssignments.length === 0 ? (
                      <p className="text-sm text-gray-500">Henüz sınıfa atanmamış</p>
                    ) : (
                      <div className="space-y-2">
                        {profile.classAssignments.map((a) => (
                          <div
                            key={a.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                          >
                            <div>
                              <Link
                                href={`/sinif-yonetimi/${a.class.id}`}
                                className="font-medium text-blue-700 hover:underline"
                              >
                                {a.class.name}
                              </Link>
                              <p className="text-xs text-gray-500">
                                {a.class.academicYear.name}
                                {a.class.academicYear.isActive && " · Aktif yıl"}
                              </p>
                            </div>
                            {a.class.counselor && (
                              <span className="text-xs text-purple-700">
                                Rehber: {a.class.counselor.firstName} {a.class.counselor.lastName}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {profile.parentLinks.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Veli portal hesapları</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {profile.parentLinks.map((pl) => (
                        <div key={pl.id} className="rounded-lg border p-3 text-sm">
                          <p className="font-medium">
                            {pl.parentName} ({pl.relation})
                          </p>
                          <p className="text-gray-500">
                            {pl.parentPhone} {pl.parentEmail && `· ${pl.parentEmail}`}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="registration" className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm text-gray-600">Kayıt durumu</p>
                  <p className="mt-1 font-semibold">{student.registrationStatusText}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm text-gray-600">İlan edilen ücret</p>
                  <p className="mt-1 font-semibold">{student.announcedTuitionFee || "—"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm text-gray-600">Öğrenci ücreti</p>
                  <p className="mt-1 font-semibold">{student.studentTuitionFee || "—"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm text-gray-600">Kitap ödemesi</p>
                  <p className="mt-1 font-semibold">
                    {student.bookPaymentPaid === true
                      ? "Alındı"
                      : student.bookPaymentPaid === false
                        ? "Alınmadı"
                        : "Belirtilmemiş"}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Kayıt yenilemeleri ({profile.renewals.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {profile.renewals.length === 0 ? (
                    <p className="text-sm text-gray-500">Kayıt yok</p>
                  ) : (
                    profile.renewals.map((r) => (
                      <div key={r.id} className="rounded-lg border p-3 text-sm">
                        <p className="font-medium">{formatDate(r.createdAt)}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Yeni kayıtlar ({profile.newRegistrations.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {profile.newRegistrations.length === 0 ? (
                    <p className="text-sm text-gray-500">Kayıt yok</p>
                  ) : (
                    profile.newRegistrations.map((r) => (
                      <div key={r.id} className="rounded-lg border p-3 text-sm">
                        <p className="font-medium">{formatDate(r.createdAt)}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Sözleşmeler</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  ["Kıyafet", profile.contracts.uniform.length],
                  ["Yemek", profile.contracts.meal.length],
                  ["Servis", profile.contracts.service.length],
                  ["Kitap", profile.contracts.book.length],
                ].map(([label, count]) => (
                  <div key={String(label)} className="rounded-lg border p-4 text-center">
                    <p className="text-2xl font-bold text-blue-700">{count}</p>
                    <p className="text-sm text-gray-600">{label}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {dashboard && (
            <>
              <TabsContent value="homework">
                <Card>
                  <CardHeader>
                    <CardTitle>Ödevler ({dashboard.recentData.homeworks.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {dashboard.recentData.homeworks.length === 0 ? (
                      <p className="text-sm text-gray-500">Ödev kaydı yok</p>
                    ) : (
                      dashboard.recentData.homeworks.map((hw) => (
                        <div key={hw.id} className="flex items-center justify-between rounded-lg border p-4">
                          <div>
                            <p className="font-medium">{hw.homework.title}</p>
                            <p className="text-xs text-gray-500">
                              {hw.homework.subject} · {hw.homework.teacher.firstName}{" "}
                              {hw.homework.teacher.lastName}
                            </p>
                            <p className="text-xs text-gray-500">Teslim: {formatDate(hw.homework.dueDate)}</p>
                          </div>
                          {hw.isCompleted ? (
                            <span className="flex items-center gap-1 text-sm text-green-700">
                              <CheckCircle className="h-4 w-4" /> Tamamlandı
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-sm text-orange-700">
                              <Clock className="h-4 w-4" /> Bekliyor
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="attendance">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      Yoklama · %{dashboard.statistics.attendanceRate} devam (
                      {dashboard.statistics.presentCount}/{dashboard.statistics.totalAttendances})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {dashboard.recentData.attendances.map((a) => (
                      <div key={a.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                        <div>
                          <p className="font-medium">{a.lessonName}</p>
                          <p className="text-xs text-gray-500">
                            {formatDate(a.date)} · {a.teacher.firstName} {a.teacher.lastName}
                          </p>
                        </div>
                        <span className={cn("rounded-full px-2 py-1 text-xs font-medium", attendanceClass(a.status))}>
                          {attendanceLabel(a.status)}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="exams">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Sınav sonuçları
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {dashboard.recentData.examResults.length === 0 ? (
                      <p className="text-sm text-gray-500">Yayınlanmış sınav sonucu yok</p>
                    ) : (
                      dashboard.recentData.examResults.map((er) => (
                        <div key={er.id} className="flex items-center justify-between rounded-lg border p-4">
                          <div>
                            <p className="font-medium">{er.exam.name}</p>
                            <p className="text-xs text-gray-500">
                              {er.exam.examType} · {formatDate(er.exam.examDate)}
                              {er.exam.class?.name && ` · ${er.exam.class.name}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-purple-700">{er.totalScore ?? "—"}</p>
                            {er.ranking != null && (
                              <p className="text-xs text-gray-500">{er.ranking}. sıra</p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="comments">
                <Card>
                  <CardHeader>
                    <CardTitle>Görüşler</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {dashboard.recentData.comments.map((c) => (
                      <div key={c.id} className="rounded-lg border p-4">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="font-medium">
                            {c.staff.firstName} {c.staff.lastName}
                          </span>
                          <span className="text-xs text-gray-500">{formatDate(c.createdAt)}</span>
                          {c.isPositive ? (
                            <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">Olumlu</span>
                          ) : (
                            <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-800">Gelişmeli</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700">{c.content}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activities">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      IB faaliyetleri
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {dashboard.recentData.activities.length === 0 ? (
                      <p className="text-sm text-gray-500">Faaliyet kaydı yok</p>
                    ) : (
                      dashboard.recentData.activities.map((act) => (
                        <div key={act.id} className="rounded-lg border p-4">
                          <p className="font-medium">{act.title}</p>
                          <p className="text-xs text-gray-500">
                            {act.type} · {formatDate(act.activityDate)}
                            {act.location && (
                              <>
                                {" "}
                                · <MapPin className="inline h-3 w-3" /> {act.location}
                              </>
                            )}
                          </p>
                          {act.isVerified && (
                            <span className="mt-1 inline-block text-xs text-green-700">Doğrulandı</span>
                          )}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          )}

          <TabsContent value="clubs">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Kulüp seçimleri
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profile.clubSelections.length === 0 ? (
                  <p className="text-sm text-gray-500">Kulüp seçimi yok</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {profile.clubSelections.map((cs) => (
                      <div key={cs.id} className="rounded-lg border p-4">
                        <p className="font-medium">{cs.club.name}</p>
                        <p className="text-xs text-gray-500">Kapasite: {cs.club.capacity}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="meetings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Veli görüşmeleri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {profile.parentMeetings.length === 0 ? (
                  <p className="text-sm text-gray-500">Veli görüşmesi kaydı yok</p>
                ) : (
                  profile.parentMeetings.map((m) => (
                    <div key={m.id} className="rounded-lg border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{formatDate(m.meetingDate)}</p>
                        {m.counselorName && (
                          <span className="text-xs text-purple-700">{m.counselorName}</span>
                        )}
                      </div>
                      {m.notes && <p className="mt-2 text-sm text-gray-700">{m.notes}</p>}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
