"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  User,
  Calendar,
  MapPin,
  Clock,
  FileText,
  CheckCircle,
  Loader2,
  BookOpen,
} from "lucide-react"

type ActivityType =
  | "ETKINLIK"
  | "GEZI"
  | "PROJE"
  | "SINAV"
  | "YARISMA"
  | "SEMINER"
  | "WORKSHOP"
  | "SPORT"
  | "SANAT"
  | "SOSYAL"
  | "DIL"
  | "BILIM"
  | "DEGER"
  | "DIGER"

interface Activity {
  id: string
  studentId: string
  type: ActivityType
  title: string
  description: string | null
  activityDate: string
  location: string | null
  organizer: string | null
  duration: number | null
  participants: number | null
  outcome: string | null
  evidence: string
  isVerified: boolean
  verifiedBy: string | null
  verifiedAt: string | null
  notes: string | null
  certificateData?: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  ETKINLIK: "Etkinlik",
  GEZI: "Gezi",
  PROJE: "Proje",
  SINAV: "Sınav",
  YARISMA: "Yarışma",
  SEMINER: "Seminer",
  WORKSHOP: "Workshop",
  SPORT: "Spor",
  SANAT: "Sanat",
  SOSYAL: "Sosyal Sorumluluk",
  DIL: "Dil Faaliyeti",
  BILIM: "Bilim",
  DEGER: "Değerler Eğitimi",
  DIGER: "Diğer",
}

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
  const headers: HeadersInit = { "Content-Type": "application/json" }
  if (token) headers["Authorization"] = `Bearer ${token}`
  return headers
}

export default function IbOgrenciDetayPage() {
  const params = useParams()
  const router = useRouter()
  const studentId = typeof params.id === "string" ? params.id : ""
  const [student, setStudent] = useState<{
    id: string
    firstName: string
    lastName: string
    grade: string
    tcNumber: string
  } | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)

  const fetchStudent = useCallback(async () => {
    if (!studentId) return
    try {
      const res = await fetch(`/api/students/${studentId}`, {
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        if (res.status === 404) setStudent(null)
        return
      }
      const data = await res.json()
      const s = data.student ?? data
      setStudent({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        grade: s.grade ?? "",
        tcNumber: s.tcNumber ?? "",
      })
    } catch {
      setStudent(null)
    }
  }, [studentId])

  const fetchActivities = useCallback(async () => {
    if (!studentId) return
    try {
      const res = await fetch(
        `/api/activities?studentId=${studentId}&limit=500`,
        { headers: getAuthHeaders() }
      )
      if (!res.ok) return
      const data = await res.json()
      setActivities(data.activities ?? [])
    } catch {
      setActivities([])
    }
  }, [studentId])

  useEffect(() => {
    const role = typeof window !== "undefined" ? localStorage.getItem("auth_role") : null
    const allowed = ["admin", "principal", "student_affairs", "counselor", "head_counselor", "teacher"]
    if (role && allowed.includes(role)) setHasAccess(true)
    else setHasAccess(false)
  }, [])

  useEffect(() => {
    if (hasAccess === true && studentId) {
      setLoading(true)
      Promise.all([fetchStudent(), fetchActivities()]).finally(() =>
        setLoading(false)
      )
    }
  }, [hasAccess, studentId, fetchStudent, fetchActivities])

  useEffect(() => {
    if (hasAccess === false) router.push("/login")
  }, [hasAccess, router])

  if (hasAccess === null || loading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            <p className="text-gray-500 mt-4">Yükleniyor...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!student && !loading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">Öğrenci bulunamadı.</p>
            <Link href="/ogretmen/ib-yonetimi">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                IB Yönetimine Dön
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const fullName = student ? `${student.firstName} ${student.lastName}`.trim() : ""
  const verifiedCount = activities.filter((a) => a.isVerified).length

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/ogretmen/ib-yonetimi">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
            <p className="text-gray-500">
              IB faaliyet katılım detayı · {activities.length} faaliyet
            </p>
          </div>
        </div>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            Öğrenci bilgisi
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Ad Soyad</p>
            <p className="mt-1 font-medium text-gray-900">{fullName}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Sınıf</p>
            <p className="mt-1 font-medium text-gray-900">{student?.grade ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">TC Kimlik No</p>
            <p className="mt-1 font-mono text-sm text-gray-700">{student?.tcNumber ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Doğrulanmış</p>
            <p className="mt-1 font-medium text-emerald-600">
              {verifiedCount} / {activities.length} faaliyet
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-600" />
            Faaliyetler
          </CardTitle>
          <CardDescription>
            Bu öğrencinin katıldığı tüm faaliyetler; tarih, tür, başlık ve detaylar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Henüz faaliyet kaydı yok</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {activities
                .sort(
                  (a, b) =>
                    new Date(b.activityDate).getTime() -
                    new Date(a.activityDate).getTime()
                )
                .map((activity) => (
                  <li key={activity.id}>
                    <Card className="card-soft border border-gray-100">
                      <CardContent className="p-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="flex-1 min-w-0 space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-bold text-gray-900">
                                {activity.title}
                              </h3>
                              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                                {ACTIVITY_TYPE_LABELS[activity.type]}
                              </span>
                              {activity.isVerified ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  Doğrulanmış
                                </span>
                              ) : (
                                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                                  Bekliyor
                                </span>
                              )}
                            </div>
                            <div className="grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 shrink-0 text-gray-400" />
                                <span>
                                  {new Date(activity.activityDate).toLocaleDateString(
                                    "tr-TR",
                                    {
                                      day: "numeric",
                                      month: "long",
                                      year: "numeric",
                                    }
                                  )}
                                </span>
                              </div>
                              {activity.location && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
                                  <span>{activity.location}</span>
                                </div>
                              )}
                              {activity.organizer && (
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 shrink-0 text-gray-400" />
                                  <span>Organizatör: {activity.organizer}</span>
                                </div>
                              )}
                              {activity.duration != null && (
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 shrink-0 text-gray-400" />
                                  <span>{activity.duration} dk</span>
                                </div>
                              )}
                            </div>
                            {activity.description && (
                              <p className="text-sm text-gray-700 leading-relaxed">
                                {activity.description}
                              </p>
                            )}
                            {activity.outcome && (
                              <div className="rounded-lg bg-gray-50 p-3">
                                <p className="text-xs font-medium uppercase text-gray-500">
                                  Sonuç / Kazanım
                                </p>
                                <p className="mt-1 text-sm text-gray-800">
                                  {activity.outcome}
                                </p>
                              </div>
                            )}
                            {activity.evidence && (
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-gray-400" />
                                <a
                                  href={activity.evidence}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline truncate max-w-md"
                                >
                                  Kanıt / Dosya
                                </a>
                              </div>
                            )}
                            {activity.notes && (
                              <p className="text-xs text-gray-500 italic">
                                Not: {activity.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Link href="/ogretmen/ib-yonetimi">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            IB Yönetimine Dön
          </Button>
        </Link>
      </div>
    </div>
  )
}
