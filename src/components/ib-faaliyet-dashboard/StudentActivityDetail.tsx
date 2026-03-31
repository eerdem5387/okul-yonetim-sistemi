"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
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
  FileText,
  CheckCircle,
  BookOpen,
  ImageIcon,
  ExternalLink,
  FileDown,
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

export interface StudentActivityDetailActivity {
  id: string
  source?: "legacy" | "event"
  detailHref?: string
  studentId: string
  type: ActivityType
  title: string
  description: string | null
  activityDate: string
  location?: string | null
  organizer?: string | null
  duration?: number | null
  participants?: number | null
  outcome?: string | null
  evidence?: string
  isVerified: boolean
  verificationStatus?: "IMZA_SURECINDE" | "ONAY_BEKLIYOR" | "ONAYLANDI"
  category?: string | null
  subtype?: string | null
  participationPhotoUrl?: string | null
  extraDocumentUrl?: string | null
  signedDocumentUrls?: string[]
  score?: number | null
  languageLevel?: string | null
  projectRole?: string | null
  tournamentPlacement?: string | null
  artworkDescription?: string | null
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

const CATEGORY_LABELS: Record<string, string> = {
  egitim: "Eğitim",
  etkinlik: "Etkinlik",
  spor: "Spor",
  yarisma: "Yarışma",
}

export interface StudentActivityDetailProps {
  student: {
    id: string
    firstName: string
    lastName: string
    grade: string
    tcNumber?: string
  } | null
  activities: StudentActivityDetailActivity[]
  totalInSystem: number
  backHref: string
  backLabel: string
}

export function StudentActivityDetail({
  student,
  activities,
  totalInSystem,
  backHref,
  backLabel,
}: StudentActivityDetailProps) {
  const router = useRouter()

  if (!student) {
    return (
      <div className="p-6 space-y-6">
        <Link href={backHref} className="inline-flex items-center text-sm text-blue-600 hover:underline mb-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          {backLabel}
        </Link>
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            Öğrenci bulunamadı.
          </CardContent>
        </Card>
      </div>
    )
  }

  const participationCount = activities.length
  const participationPercent =
    totalInSystem > 0 ? Math.round((participationCount / totalInSystem) * 100) : 0
  const verifiedCount = activities.filter((a) => a.isVerified || a.verificationStatus === "ONAYLANDI").length
  const successRate =
    participationCount > 0 ? Math.round((verifiedCount / participationCount) * 100) : 0
  const byType: Record<string, number> = {}
  activities.forEach((a) => {
    byType[a.type] = (byType[a.type] || 0) + 1
  })
  const mostParticipatedType = Object.entries(byType).sort((a, b) => b[1] - a[1])[0]
  const mostTypeLabel = mostParticipatedType
    ? ACTIVITY_TYPE_LABELS[mostParticipatedType[0] as ActivityType] || mostParticipatedType[0]
    : "-"

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href={backHref} className="inline-flex items-center text-sm text-blue-600 hover:underline mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            {backLabel}
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {student.firstName} {student.lastName}
          </h1>
          {student.grade && <p className="text-gray-500 mt-1">{student.grade}. Sınıf</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow">
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Katıldığı faaliyet</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{participationCount}</p>
            <p className="text-xs text-gray-500 mt-1">Toplam {totalInSystem} faaliyete oranla</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow">
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Katılım oranı</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">%{participationPercent}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow">
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">En çok katıldığı tür</p>
            <p className="text-lg font-bold text-gray-900 mt-1 truncate">{mostTypeLabel}</p>
            {mostParticipatedType && (
              <p className="text-xs text-gray-500 mt-0.5">{mostParticipatedType[1]} faaliyet</p>
            )}
          </CardContent>
        </Card>
        <Card className="border-0 shadow">
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Başarı oranı (doğrulanan)</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">%{successRate}</p>
            <p className="text-xs text-gray-500 mt-1">
              {verifiedCount} / {participationCount} doğrulanmış
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-600" />
            Faaliyetler
          </CardTitle>
          <CardDescription>
            Bu öğrencinin katıldığı faaliyetler; katılım fotoğrafları ve detaylar
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
                    new Date(b.activityDate).getTime() - new Date(a.activityDate).getTime()
                )
                .map((activity) => (
                  <li key={activity.id}>
                    <Card
                      role="link"
                      tabIndex={0}
                      className="card-soft border border-gray-100 cursor-pointer transition-shadow hover:shadow-md focus-visible:outline focus-visible:ring-2 focus-visible:ring-indigo-500"
                      onClick={() => router.push(activity.detailHref || `/activities/kayit/${activity.id}?from=student&studentId=${student.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          router.push(activity.detailHref || `/activities/kayit/${activity.id}?from=student&studentId=${student.id}`)
                        }
                      }}
                    >
                      <CardContent className="p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                          <div className="flex-1 min-w-0 space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-bold text-gray-900">{activity.title}</h3>
                              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                                {activity.category
                                  ? CATEGORY_LABELS[activity.category] || activity.category
                                  : ACTIVITY_TYPE_LABELS[activity.type]}
                              </span>
                              {(activity.verificationStatus ?? (activity.isVerified ? "ONAYLANDI" : "IMZA_SURECINDE")) === "ONAYLANDI" ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  Onaylandı
                                </span>
                              ) : (activity.verificationStatus ?? "") === "ONAY_BEKLIYOR" ? (
                                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                                  Onay bekliyor
                                </span>
                              ) : (
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                  İmza sürecinde
                                </span>
                              )}
                            </div>
                            <div className="grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 shrink-0 text-gray-400" />
                                <span>
                                  {new Date(activity.activityDate).toLocaleDateString("tr-TR", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                  })}
                                </span>
                              </div>
                              {activity.organizer && (
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 shrink-0 text-gray-400" />
                                  <span>{activity.organizer}</span>
                                </div>
                              )}
                            </div>
                            {activity.description && (
                              <p className="text-sm text-gray-700 leading-relaxed line-clamp-2">
                                {activity.description}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-2">
                              {activity.score != null && (
                                <span className="rounded-full bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5">
                                  Puan: {activity.score}/100
                                </span>
                              )}
                              {activity.languageLevel && (
                                <span className="rounded-full bg-purple-100 text-purple-700 text-xs px-2 py-0.5">
                                  Seviye: {activity.languageLevel}
                                </span>
                              )}
                              {activity.projectRole?.trim() && (
                                <span className="rounded-full bg-amber-100 text-amber-900 text-xs px-2 py-0.5">
                                  Rol: {activity.projectRole}
                                </span>
                              )}
                              {activity.tournamentPlacement?.trim() && (
                                <span className="rounded-full bg-cyan-100 text-cyan-800 text-xs px-2 py-0.5">
                                  Derece: {activity.tournamentPlacement}
                                </span>
                              )}
                              {activity.extraDocumentUrl && (
                                <a
                                  href={activity.extraDocumentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="rounded-full bg-gray-100 text-gray-700 text-xs px-2 py-0.5 inline-flex items-center gap-1 hover:bg-gray-200"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Ek Belge
                                </a>
                              )}
                              {activity.signedDocumentUrls && activity.signedDocumentUrls.length > 0 && (
                                <a
                                  href={activity.signedDocumentUrls[0]}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="rounded-full bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 inline-flex items-center gap-1 hover:bg-emerald-200"
                                >
                                  <FileDown className="h-3 w-3" />
                                  İmzalı Belge
                                </a>
                              )}
                            </div>
                          </div>
                          {activity.participationPhotoUrl && (
                            <div className="shrink-0">
                              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                                <ImageIcon className="h-3.5 w-3.5" />
                                Katılım fotoğrafı
                              </p>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  window.open(
                                    activity.participationPhotoUrl!,
                                    "_blank",
                                    "noopener,noreferrer"
                                  )
                                }}
                                className="block rounded-lg border border-gray-200 overflow-hidden w-24 h-24 sm:w-28 sm:h-28 text-left"
                              >
                                <img
                                  src={activity.participationPhotoUrl}
                                  alt="Katılım"
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            </div>
                          )}
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
        <Link href={backHref}>
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Listeye Dön
          </Button>
        </Link>
      </div>
    </div>
  )
}
