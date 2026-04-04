"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Users,
  FileText,
  UserPlus,
  TrendingUp,
  Calendar,
  Activity,
  ArrowRight,
  Sparkles,
  Target,
  Handshake,
  Briefcase,
  AlertCircle,
  School,
  LayoutGrid,
  MessageSquare,
  Award,
} from "lucide-react"
import Link from "next/link"

interface DashboardStats {
  totalStudents: number
  totalNewRegistrations: number
  totalRenewals: number
  totalStaff: number
  totalClubs: number
  clubCapacityAverage: number
}

interface RecentStudent {
  id: string
  firstName: string
  lastName: string
  grade: string
  createdAt: string
}

interface RecentActivity {
  id: string
  type: string
  studentName: string
  createdAt: string
  contractType: string
}

interface RecentNewRegistration {
  id: string
  createdAt: string
  student?: { firstName: string; lastName: string; grade: string }
}

interface RecentRenewal {
  id: string
  createdAt: string
  student?: { firstName: string; lastName: string; grade: string }
}

interface RecentTeklifGorusmesi {
  id: string
  ogrenciAdSoyad: string
  sinif: string
  createdAt: string
  kayitlar: Array<{ durum: "OLUMLU" | "OLUMSUZ" | "BELIRSIZ" }>
}

interface DashboardInsights {
  activeAcademicYear: { id: string; name: string } | null
  renewalTargetYear: { id: string; name: string; label: string } | null
  counts: {
    students: number
    newRegistrations: number
    renewals: number
    classes: number
  }
  studentsWithoutClassInActiveYear: {
    total: number
    sample: Array<{ id: string; firstName: string; lastName: string }>
  }
  studentsWithoutRenewalForTargetYear: {
    total: number
    sample: Array<{ id: string; firstName: string; lastName: string; grade: string | null }>
  }
}

/** Öğrenci için belirlenen ücret (studentTotal) alanını sayıya çevirir */
function parseContractFee(val: unknown): number {
  if (val == null || val === "") return 0
  const s = String(val).trim().replace(/\s/g, "")
  const cleaned = s.replace(/[^\d,.]/g, "")
  const noThousands = cleaned.replace(/\./g, "").replace(",", ".")
  const num = parseFloat(noThousands)
  return Number.isNaN(num) ? 0 : num
}

interface ContractTotals {
  newRegTotal: number
  renewalTotal: number
  total: number
}

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalNewRegistrations: 0,
    totalRenewals: 0,
    totalStaff: 0,
    totalClubs: 0,
    clubCapacityAverage: 0
  })
  const [recentStudents, setRecentStudents] = useState<RecentStudent[]>([])
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [recentNewRegistrations, setRecentNewRegistrations] = useState<RecentNewRegistration[]>([])
  const [recentRenewals, setRecentRenewals] = useState<RecentRenewal[]>([])
  const [recentTeklifGorusmeleri, setRecentTeklifGorusmeleri] = useState<RecentTeklifGorusmesi[]>([])
  const [contractTotalsByYear, setContractTotalsByYear] = useState<Record<string, ContractTotals>>({})
  const [overallContractTotals, setOverallContractTotals] = useState<ContractTotals>({ newRegTotal: 0, renewalTotal: 0, total: 0 })
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [insights, setInsights] = useState<DashboardInsights | null>(null)

  useEffect(() => {
    fetchDashboardData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      const insightsRes = await fetch("/api/dashboard/insights")
      if (insightsRes.ok) {
        setInsights(await insightsRes.json())
      } else {
        setInsights(null)
      }

      const studentsRes = await fetch("/api/students?limit=1000")
      const studentsData = studentsRes.ok ? await studentsRes.json() : {}
      const students = Array.isArray(studentsData) ? studentsData : (studentsData.students || [])
      
      const clubsRes = await fetch("/api/clubs")
      const clubs = clubsRes.ok ? await clubsRes.json() : []
      
      const [newRegRes, renewalRes, teklifRes, staffRes, uniformRes, mealRes, serviceRes, bookRes] = await Promise.all([
        fetch("/api/new-registrations"),
        fetch("/api/renewals"),
        fetch("/api/teklif-gorusmeleri?limit=5&page=1"),
        fetch("/api/staff?limit=1&page=1"),
        fetch("/api/uniform-contracts"),
        fetch("/api/meal-contracts"),
        fetch("/api/service-contracts"),
        fetch("/api/book-contracts")
      ])
      
      // Yeni Kayıt / Kayıt Yenileme büyük kartları için son 5 kayıt ve toplam sayılar
      const newRegList = newRegRes.ok ? await newRegRes.json() : []
      const renewalList = renewalRes.ok ? await renewalRes.json() : []
      setRecentNewRegistrations(newRegList.slice(0, 5))
      setRecentRenewals(renewalList.slice(0, 5))
      const teklifData = teklifRes.ok ? await teklifRes.json() : {}
      setRecentTeklifGorusmeleri(teklifData.teklifGorusmeleri || [])

      // Sözleşme tutarları: Öğrenci için belirlenen ücret (studentTotal) bazında, eğitim öğretim dönemine göre.
      // Akademik yıl belirtilmeyen sözleşmeler "Belirtilmemiş" grubuna alınır ve "Tümü" toplamına dahil edilir.
      const byYear: Record<string, ContractTotals> = {}
      const normalizeYear = (val: unknown) => {
        const s = String(val ?? "").trim()
        return s === "" ? "Belirtilmemiş" : s
      }
      for (const item of newRegList) {
        const data = (item.contractData || {}) as Record<string, unknown>
        const fee = parseContractFee(data.studentTotal ?? data.studentTuitionFee)
        const year = normalizeYear(data.academicYear)
        if (!byYear[year]) byYear[year] = { newRegTotal: 0, renewalTotal: 0, total: 0 }
        byYear[year].newRegTotal += fee
        byYear[year].total += fee
      }
      for (const item of renewalList) {
        const data = (item.contractData || {}) as Record<string, unknown>
        const fee = parseContractFee(data.studentTotal ?? data.studentTuitionFee)
        const year = normalizeYear(data.academicYear)
        if (!byYear[year]) byYear[year] = { newRegTotal: 0, renewalTotal: 0, total: 0 }
        byYear[year].renewalTotal += fee
        byYear[year].total += fee
      }
      setContractTotalsByYear(byYear)
      // "Tümü" = tüm dönemlerin toplamı (Belirtilmemiş dahil)
      const overall = Object.values(byYear).reduce<ContractTotals>(
        (acc, t) => ({
          newRegTotal: acc.newRegTotal + t.newRegTotal,
          renewalTotal: acc.renewalTotal + t.renewalTotal,
          total: acc.total + t.total
        }),
        { newRegTotal: 0, renewalTotal: 0, total: 0 }
      )
      setOverallContractTotals(overall)

      // Her sözleşme türüne type bilgisini ekle (Son İşlemler için)
      const newRegistrations = newRegList.map((c: { id: string; studentId: string; createdAt: string }) => ({ ...c, type: "new-registration" }))
      const renewals = renewalList.map((c: { id: string; studentId: string; createdAt: string }) => ({ ...c, type: "renewal" }))
      const uniforms = uniformRes.ok ? (await uniformRes.json()).map((c: { id: string; studentId: string; createdAt: string }) => ({ ...c, type: "uniform" })) : []
      const meals = mealRes.ok ? (await mealRes.json()).map((c: { id: string; studentId: string; createdAt: string }) => ({ ...c, type: "meal" })) : []
      const services = serviceRes.ok ? (await serviceRes.json()).map((c: { id: string; studentId: string; createdAt: string }) => ({ ...c, type: "service" })) : []
      const books = bookRes.ok ? (await bookRes.json()).map((c: { id: string; studentId: string; createdAt: string }) => ({ ...c, type: "book" })) : []
      
      const allContracts = [
        ...newRegistrations,
        ...renewals,
        ...uniforms,
        ...meals,
        ...services,
        ...books
      ]
      
      const clubCapacityAverage = clubs.length > 0
        ? clubs.reduce((acc: number, club: { selections?: unknown[]; capacity?: number }) => {
            const percentage = (club.selections?.length || 0) / (club.capacity || 1) * 100
            return acc + percentage
          }, 0) / clubs.length
        : 0
      
      const staffData = staffRes.ok ? await staffRes.json() : {}
      const totalStaff = staffData.pagination?.total ?? 0

      setStats({
        totalStudents: Array.isArray(students) ? students.length : 0,
        totalNewRegistrations: newRegList.length,
        totalRenewals: renewalList.length,
        totalStaff,
        totalClubs: Array.isArray(clubs) ? clubs.length : 0,
        clubCapacityAverage: Math.round(clubCapacityAverage)
      })
      
      if (Array.isArray(students)) {
        const sorted = [...students].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ).slice(0, 5)
        setRecentStudents(sorted)
      }
      
      const allContractsWithDetails = allContracts.map((contract: { id: string; studentId: string; type?: string; createdAt: string }) => {
        const student = students.find((s: { id: string; firstName: string; lastName: string }) => s.id === contract.studentId)
        return {
          id: contract.id,
          type: contract.type || "unknown",
          studentName: student ? `${student.firstName} ${student.lastName}` : "Bilinmeyen Öğrenci",
          createdAt: contract.createdAt,
          contractType: getContractTypeDisplay(contract.type || "unknown")
        }
      }).sort((a: { createdAt: string }, b: { createdAt: string }) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ).slice(0, 10)
      
      setRecentActivities(allContractsWithDetails)
      
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getContractTypeDisplay = (type: string) => {
    const typeMap: Record<string, string> = {
      "new-registration": "Yeni Kayıt",
      "renewal": "Kayıt Yenileme",
      "uniform": "Forma Sözleşmesi",
      "meal": "Yemek Sözleşmesi",
      "service": "Servis Sözleşmesi",
      "book": "Kitap Sözleşmesi"
    }
    return typeMap[type] || type
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-3 sm:p-4 md:p-6 lg:p-8">
      {/* Page Header */}
      <div className="page-header animate-fade-in mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
          <div className="p-1.5 sm:p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg sm:rounded-xl shadow-lg">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
          </div>
          <h1 className="page-title text-xl sm:text-2xl lg:text-3xl">Dashboard</h1>
        </div>
        <p className="page-subtitle text-xs sm:text-sm">Okul yönetim sistemine hoş geldiniz</p>
      </div>

      {/* Hızlı erişim + özet */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <Card className="border-0 shadow-md lg:col-span-2 bg-white/90">
          <CardHeader className="pb-2 pt-4 px-4 sm:px-6">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-base sm:text-lg">Hızlı erişim</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              Sık kullanılan modüllere tek tıkla gidin
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {[
              { href: "/new-registration", label: "Yeni Kayıt", icon: Calendar },
              { href: "/renewal", label: "Kayıt Yenileme", icon: FileText },
              { href: "/students", label: "Öğrenciler", icon: UserPlus },
              { href: "/sinif-yonetimi", label: "Sınıf Yönetimi", icon: School },
              { href: "/yonetim/parent-meetings", label: "Veli Görüşmeleri", icon: MessageSquare },
              { href: "/faaliyet-yonetimi", label: "Faaliyet", icon: Award },
              { href: "/clubs", label: "Kulüpler", icon: Target },
              { href: "/personel", label: "Personel", icon: Briefcase },
            ].map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gradient-to-br from-slate-50 to-indigo-50/40 px-3 py-2.5 text-xs sm:text-sm font-medium text-gray-800 hover:border-indigo-200 hover:shadow-sm transition-all"
              >
                <Icon className="h-4 w-4 text-indigo-600 shrink-0" />
                <span className="truncate">{label}</span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-slate-800 to-indigo-900 text-white">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base text-white">Akademik yıl özeti</CardTitle>
            <CardDescription className="text-indigo-200 text-xs">
              Kayıt ve yenileme bağlamı
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3 text-sm">
            {insights?.activeAcademicYear ? (
              <div>
                <p className="text-indigo-300 text-xs uppercase tracking-wide">Aktif yıl</p>
                <p className="font-semibold">{insights.activeAcademicYear.name}</p>
              </div>
            ) : (
              <p className="text-indigo-200 text-xs">Aktif akademik yıl atanmamış.</p>
            )}
            {insights?.renewalTargetYear ? (
              <div>
                <p className="text-indigo-300 text-xs uppercase tracking-wide">Kayıt yenileme hedefi</p>
                <p className="font-semibold">{insights.renewalTargetYear.name}</p>
                <p className="text-indigo-200 text-xs">{insights.renewalTargetYear.label}</p>
              </div>
            ) : (
              <p className="text-indigo-200 text-xs">Yenileme hedef yılı tanımlı değil (aktif + sıradaki yıl gerekir).</p>
            )}
            {insights?.counts && (
              <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2 text-xs">
                <span className="text-indigo-200">Sınıf</span>
                <span className="text-right font-mono">{insights.counts.classes}</span>
                <span className="text-indigo-200">Öğrenci</span>
                <span className="text-right font-mono">{insights.counts.students}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Eksik işlemler: sınıf ataması */}
      {insights &&
        insights.studentsWithoutClassInActiveYear.total > 0 &&
        insights.activeAcademicYear && (
          <Card className="shadow-md border-l-4 border-l-amber-500 mb-4 sm:mb-6 bg-amber-50/60 border border-amber-100">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-700" />
                <CardTitle className="text-base text-amber-950">
                  Dikkat: Sınıf ataması eksik öğrenciler
                </CardTitle>
              </div>
              <CardDescription className="text-amber-900/80 text-sm">
                Aktif akademik yıl ({insights.activeAcademicYear.name}) için bu öğrenciler henüz bir sınıfa
                eklenmemiş. Toplam{" "}
                <strong>{insights.studentsWithoutClassInActiveYear.total}</strong> kayıt.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {insights.studentsWithoutClassInActiveYear.sample.map((s) => (
                <Link
                  key={s.id}
                  href="/sinif-yonetimi"
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm hover:border-amber-400 hover:shadow-sm transition-all"
                >
                  <p className="text-gray-900">
                    <span className="font-semibold">
                      {s.firstName} {s.lastName}
                    </span>{" "}
                    isimli öğrencinin sınıf ataması yapılmamıştır.
                  </p>
                  <span className="shrink-0 inline-flex items-center justify-center rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white">
                    Hemen atama yapmak için tıklayın
                  </span>
                </Link>
              ))}
              {insights.studentsWithoutClassInActiveYear.total >
                insights.studentsWithoutClassInActiveYear.sample.length && (
                <p className="text-xs text-amber-900 pt-1">
                  ve{" "}
                  {insights.studentsWithoutClassInActiveYear.total -
                    insights.studentsWithoutClassInActiveYear.sample.length}{" "}
                  öğrenci daha… Tümünü görmek için{" "}
                  <Link href="/sinif-yonetimi" className="underline font-medium">
                    Sınıf Yönetimi
                  </Link>
                  .
                </p>
              )}
            </CardContent>
          </Card>
        )}

      {insights &&
        insights.renewalTargetYear &&
        insights.studentsWithoutRenewalForTargetYear.total > 0 && (
          <Card className="shadow-md border-l-4 border-l-indigo-500 mb-4 sm:mb-6 bg-indigo-50/50 border border-indigo-100">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-700" />
                <CardTitle className="text-base text-indigo-950">
                  Kayıt yenilemesi yapılmayan öğrenciler
                </CardTitle>
              </div>
              <CardDescription className="text-indigo-900/80 text-sm">
                {insights.renewalTargetYear.name} ({insights.renewalTargetYear.label}) için henüz kayıt yenileme
                (veya bu yıla ait yeni kayıt) bulunmayan öğrenciler. Toplam{" "}
                <strong>{insights.studentsWithoutRenewalForTargetYear.total}</strong> kayıt.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {insights.studentsWithoutRenewalForTargetYear.sample.map((s) => (
                <Link
                  key={s.id}
                  href="/renewal"
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-3 text-sm hover:border-indigo-400 hover:shadow-sm transition-all"
                >
                  <p className="text-gray-900">
                    <span className="font-semibold">
                      {s.firstName} {s.lastName}
                    </span>
                    {s.grade ? (
                      <span className="text-gray-600"> — {s.grade}</span>
                    ) : null}
                  </p>
                  <span className="shrink-0 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">
                    Kayıt yenilemeye git
                  </span>
                </Link>
              ))}
              {insights.studentsWithoutRenewalForTargetYear.total >
                insights.studentsWithoutRenewalForTargetYear.sample.length && (
                <p className="text-xs text-indigo-900 pt-1">
                  ve{" "}
                  {insights.studentsWithoutRenewalForTargetYear.total -
                    insights.studentsWithoutRenewalForTargetYear.sample.length}{" "}
                  öğrenci daha… Tüm öğrenciler için{" "}
                  <Link href="/renewal" className="underline font-medium">
                    Kayıt Yenileme
                  </Link>{" "}
                  ekranını kullanın.
                </p>
              )}
            </CardContent>
          </Card>
        )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8 animate-slide-in-right">
        <div className="stat-card group">
          <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
            <div className="stat-card-icon bg-blue-100 group-hover:bg-blue-200 transition-colors p-1.5 sm:p-2">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 icon-blue" />
            </div>
            <div className="flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
              <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              <span className="hidden sm:inline">Aktif</span>
            </div>
          </div>
          <div className="stat-card-value text-xl sm:text-2xl lg:text-3xl">
            {loading ? <div className="spinner" /> : stats.totalStudents}
          </div>
          <div className="stat-card-label text-xs sm:text-sm">Toplam Öğrenci</div>
          <div className="mt-2 sm:mt-3 lg:mt-4 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500" style={{width: '75%'}} />
          </div>
        </div>

        <div className="stat-card group">
          <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
            <div className="stat-card-icon bg-emerald-100 group-hover:bg-emerald-200 transition-colors p-1.5 sm:p-2">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 icon-green" />
            </div>
            <div className="text-[10px] sm:text-xs text-gray-500 font-medium">Toplam</div>
          </div>
          <div className="stat-card-value text-xl sm:text-2xl lg:text-3xl">
            {loading ? <div className="spinner" /> : stats.totalNewRegistrations}
          </div>
          <div className="stat-card-label text-xs sm:text-sm">Yeni Kayıt</div>
          <Link href="/new-registrations/list" className="mt-2 sm:mt-3 lg:mt-4 text-[10px] sm:text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 hover:gap-2 transition-all">
            <span className="hidden sm:inline">Detayları Gör</span>
            <span className="sm:hidden">Detay</span>
            <ArrowRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
          </Link>
        </div>

        <div className="stat-card group">
          <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
            <div className="stat-card-icon bg-orange-100 group-hover:bg-orange-200 transition-colors p-1.5 sm:p-2">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 icon-orange" />
            </div>
            <div className="text-[10px] sm:text-xs text-gray-500 font-medium">Toplam</div>
          </div>
          <div className="stat-card-value text-xl sm:text-2xl lg:text-3xl">
            {loading ? <div className="spinner" /> : stats.totalRenewals}
          </div>
          <div className="stat-card-label text-xs sm:text-sm">Kayıt Yenileme</div>
          <Link href="/renewal/list" className="mt-2 sm:mt-3 lg:mt-4 text-[10px] sm:text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 hover:gap-2 transition-all">
            <span className="hidden sm:inline">Detayları Gör</span>
            <span className="sm:hidden">Detay</span>
            <ArrowRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
          </Link>
        </div>

        <div className="stat-card group">
          <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
            <div className="stat-card-icon bg-slate-100 group-hover:bg-slate-200 transition-colors p-1.5 sm:p-2">
              <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-slate-600" />
            </div>
            <div className="text-[10px] sm:text-xs text-gray-500 font-medium">Toplam</div>
          </div>
          <div className="stat-card-value text-xl sm:text-2xl lg:text-3xl">
            {loading ? <div className="spinner" /> : stats.totalStaff}
          </div>
          <div className="stat-card-label text-xs sm:text-sm">Personel</div>
          <Link href="/personel" className="mt-2 sm:mt-3 lg:mt-4 text-[10px] sm:text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 hover:gap-2 transition-all">
            <span className="hidden sm:inline">Detayları Gör</span>
            <span className="sm:hidden">Detay</span>
            <ArrowRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
          </Link>
        </div>

        <div className="stat-card group">
          <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
            <div className="stat-card-icon bg-purple-100 group-hover:bg-purple-200 transition-colors p-1.5 sm:p-2">
              <Target className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 icon-purple" />
            </div>
            <div className="text-[10px] sm:text-xs text-gray-500 font-medium truncate">{stats.totalClubs} Kulüp</div>
          </div>
          <div className="stat-card-value text-xl sm:text-2xl lg:text-3xl">
            {loading ? <div className="spinner" /> : `%${stats.clubCapacityAverage}`}
          </div>
          <div className="stat-card-label text-xs sm:text-sm">Doluluk Oranı</div>
          <div className="progress-bar mt-2 sm:mt-3 lg:mt-4">
            <div className="progress-fill" style={{width: `${stats.clubCapacityAverage}%`}} />
          </div>
        </div>
      </div>

      {/* Yeni Kayıt, Kayıt Yenileme, Teklif Görüşmeleri - Büyük kartlar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
        {/* Yeni Kayıt */}
        <Card className="card-premium animate-fade-in border-0">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-br from-emerald-50 to-green-50 px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="p-1.5 sm:p-2 bg-emerald-100 rounded-lg flex-shrink-0">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 icon-green" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-sm sm:text-base lg:text-lg gradient-text-blue truncate">Yeni Kayıt</CardTitle>
                  <CardDescription className="text-[10px] sm:text-xs">Toplam {stats.totalNewRegistrations} · Son 5 kayıt</CardDescription>
                </div>
              </div>
              <Link href="/new-registrations/list" className="text-[10px] sm:text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 hover-scale flex-shrink-0">
                <span className="hidden sm:inline">Tümü</span>
                <ArrowRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-3 sm:pt-4 px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
            {loading ? (
              <div className="flex items-center justify-center py-6 sm:py-8">
                <div className="spinner" />
              </div>
            ) : recentNewRegistrations.length > 0 ? (
              <div className="space-y-1.5 sm:space-y-2">
                {recentNewRegistrations.map((reg, index) => (
                  <Link
                    key={reg.id}
                    href="/new-registrations/list"
                    className="flex items-center justify-between p-2 sm:p-3 hover:bg-emerald-50 rounded-lg sm:rounded-xl transition-all duration-200 group border border-transparent hover:border-emerald-200"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-emerald-600 to-green-600 flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-lg flex-shrink-0">
                        {reg.student ? `${reg.student.firstName[0]}${reg.student.lastName[0]}` : "—"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-xs sm:text-sm text-gray-900 group-hover:text-emerald-700 transition-colors truncate">
                          {reg.student ? `${reg.student.firstName} ${reg.student.lastName}` : "Bilinmeyen"}
                        </p>
                        <p className="text-[10px] sm:text-xs text-gray-500 truncate">{reg.student?.grade ?? "—"}</p>
                      </div>
                    </div>
                    <span className="badge badge-blue text-[9px] sm:text-[10px] flex-shrink-0 ml-2">
                      {new Date(reg.createdAt).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8 text-gray-500">
                <FileText className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 text-gray-300" />
                <p className="text-xs sm:text-sm">Henüz yeni kayıt yok</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Kayıt Yenileme */}
        <Card className="card-premium animate-fade-in border-0">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-br from-orange-50 to-amber-50 px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="p-1.5 sm:p-2 bg-orange-100 rounded-lg flex-shrink-0">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 icon-orange" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-sm sm:text-base lg:text-lg gradient-text-purple truncate">Kayıt Yenileme</CardTitle>
                  <CardDescription className="text-[10px] sm:text-xs">Toplam {stats.totalRenewals} · Son 5 yenileme</CardDescription>
                </div>
              </div>
              <Link href="/renewal/list" className="text-[10px] sm:text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1 hover-scale flex-shrink-0">
                <span className="hidden sm:inline">Tümü</span>
                <ArrowRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-3 sm:pt-4 px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
            {loading ? (
              <div className="flex items-center justify-center py-6 sm:py-8">
                <div className="spinner" />
              </div>
            ) : recentRenewals.length > 0 ? (
              <div className="space-y-1.5 sm:space-y-2">
                {recentRenewals.map((reg, index) => (
                  <Link
                    key={reg.id}
                    href="/renewal/list"
                    className="flex items-center justify-between p-2 sm:p-3 hover:bg-orange-50 rounded-lg sm:rounded-xl transition-all duration-200 group border border-transparent hover:border-orange-200"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-orange-600 to-amber-600 flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-lg flex-shrink-0">
                        {reg.student ? `${reg.student.firstName[0]}${reg.student.lastName[0]}` : "—"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-xs sm:text-sm text-gray-900 group-hover:text-orange-700 transition-colors truncate">
                          {reg.student ? `${reg.student.firstName} ${reg.student.lastName}` : "Bilinmeyen"}
                        </p>
                        <p className="text-[10px] sm:text-xs text-gray-500 truncate">{reg.student?.grade ?? "—"}</p>
                      </div>
                    </div>
                    <span className="badge badge-blue text-[9px] sm:text-[10px] flex-shrink-0 ml-2">
                      {new Date(reg.createdAt).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8 text-gray-500">
                <FileText className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 text-gray-300" />
                <p className="text-xs sm:text-sm">Henüz kayıt yenileme yok</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Teklif Görüşmeleri */}
        <Card className="card-premium animate-fade-in border-0">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-br from-violet-50 to-purple-50 px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="p-1.5 sm:p-2 bg-violet-100 rounded-lg flex-shrink-0">
                  <Handshake className="h-4 w-4 sm:h-5 sm:w-5 text-violet-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-sm sm:text-base lg:text-lg gradient-text-purple truncate">Teklif Görüşmeleri</CardTitle>
                  <CardDescription className="text-[10px] sm:text-xs">Son 5 teklif görüşmesi</CardDescription>
                </div>
              </div>
              <Link href="/teklif-gorusmeleri" className="text-[10px] sm:text-xs text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1 hover-scale flex-shrink-0">
                <span className="hidden sm:inline">Tümü</span>
                <ArrowRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-3 sm:pt-4 px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
            {loading ? (
              <div className="flex items-center justify-center py-6 sm:py-8">
                <div className="spinner" />
              </div>
            ) : recentTeklifGorusmeleri.length > 0 ? (
              <div className="space-y-1.5 sm:space-y-2">
                {recentTeklifGorusmeleri.map((teklif, index) => {
                  const sonDurum = teklif.kayitlar?.[0]?.durum ?? "BELIRSIZ"
                  const durumLabel = sonDurum === "OLUMLU" ? "Olumlu" : sonDurum === "OLUMSUZ" ? "Olumsuz" : "Belirsiz"
                  return (
                    <Link
                      key={teklif.id}
                      href="/teklif-gorusmeleri"
                      className="flex items-center justify-between p-2 sm:p-3 hover:bg-violet-50 rounded-lg sm:rounded-xl transition-all duration-200 group border border-transparent hover:border-violet-200"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-lg flex-shrink-0">
                          {teklif.ogrenciAdSoyad?.slice(0, 2).toUpperCase() ?? "—"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-xs sm:text-sm text-gray-900 group-hover:text-violet-700 transition-colors truncate">
                            {teklif.ogrenciAdSoyad || "—"}
                          </p>
                          <p className="text-[10px] sm:text-xs text-gray-500 truncate">{teklif.sinif} · {durumLabel}</p>
                        </div>
                      </div>
                      <span className="badge badge-blue text-[9px] sm:text-[10px] flex-shrink-0 ml-2">
                        {new Date(teklif.createdAt).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })}
                      </span>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8 text-gray-500">
                <Handshake className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 text-gray-300" />
                <p className="text-xs sm:text-sm">Henüz teklif görüşmesi yok</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Grid Layout for Recent Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
        {/* Recent Students */}
        <Card className="card-premium animate-fade-in border-0">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-br from-blue-50 to-indigo-50 px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg flex-shrink-0">
                  <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 icon-blue" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-sm sm:text-base lg:text-lg gradient-text-blue truncate">Son Eklenen Öğrenciler</CardTitle>
                  <CardDescription className="text-[10px] sm:text-xs">En son kayıt olan 5 öğrenci</CardDescription>
                </div>
              </div>
              <Link href="/students" className="text-[10px] sm:text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 hover-scale flex-shrink-0">
                <span className="hidden sm:inline">Tümü</span>
                <ArrowRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-3 sm:pt-4 px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
            {loading ? (
              <div className="flex items-center justify-center py-6 sm:py-8">
                <div className="spinner" />
              </div>
            ) : recentStudents.length > 0 ? (
              <div className="space-y-1.5 sm:space-y-2">
                {recentStudents.map((student, index) => (
                  <Link
                    key={student.id}
                    href="/students"
                    className="flex items-center justify-between p-2 sm:p-3 hover:bg-blue-50 rounded-lg sm:rounded-xl transition-all duration-200 group border border-transparent hover:border-blue-200"
                    style={{animationDelay: `${index * 50}ms`}}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-lg flex-shrink-0">
                        {student.firstName[0]}{student.lastName[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-xs sm:text-sm text-gray-900 group-hover:text-blue-700 transition-colors truncate">
                          {student.firstName} {student.lastName}
                        </p>
                        <p className="text-[10px] sm:text-xs text-gray-500 truncate">{student.grade}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <span className="badge badge-blue text-[9px] sm:text-[10px]">
                        {new Date(student.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8 text-gray-500">
                <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 text-gray-300" />
                <p className="text-xs sm:text-sm">Henüz öğrenci eklenmemiş</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card className="card-premium animate-fade-in border-0">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-br from-orange-50 to-pink-50 px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="p-1.5 sm:p-2 bg-orange-100 rounded-lg flex-shrink-0">
                  <Activity className="h-4 w-4 sm:h-5 sm:w-5 icon-orange" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-sm sm:text-base lg:text-lg gradient-text-purple truncate">Son İşlemler</CardTitle>
                  <CardDescription className="text-[10px] sm:text-xs">En son oluşturulan 10 sözleşme</CardDescription>
                </div>
              </div>
              <Link href="/history" className="text-[10px] sm:text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1 hover-scale flex-shrink-0">
                <span className="hidden sm:inline">Tümü</span>
                <ArrowRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-3 sm:pt-4 px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
            {loading ? (
              <div className="flex items-center justify-center py-6 sm:py-8">
                <div className="spinner" />
              </div>
            ) : recentActivities.length > 0 ? (
              <div className="space-y-1.5 sm:space-y-2 max-h-[300px] sm:max-h-[400px] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
                {recentActivities.map((activity, index) => (
                  <Link
                    key={activity.id}
                    href="/history"
                    className="flex items-center justify-between p-2 sm:p-3 hover:bg-orange-50 rounded-lg sm:rounded-xl transition-all duration-200 group border border-transparent hover:border-orange-200"
                    style={{animationDelay: `${index * 50}ms`}}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full flex-shrink-0 shadow-lg" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-xs sm:text-sm group-hover:text-orange-700 transition-colors truncate">
                          {activity.contractType}
                        </p>
                        <p className="text-[10px] sm:text-xs text-gray-500 truncate">{activity.studentName}</p>
                      </div>
                    </div>
                    <span className="text-[9px] sm:text-[10px] text-gray-400 whitespace-nowrap ml-1 sm:ml-2 flex-shrink-0">
                      {new Date(activity.createdAt).toLocaleDateString('tr-TR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8 text-gray-500">
                <FileText className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 text-gray-300" />
                <p className="text-xs sm:text-sm">Henüz sözleşme oluşturulmamış</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sözleşme Tutarları (Öğrenci için belirlenen ücret bazında) */}
      <div className="animate-fade-in mb-4 sm:mb-6 lg:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 bg-emerald-100 rounded-lg">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
            </div>
            <h2 className="section-title text-base sm:text-lg lg:text-xl">Yapılan Sözleşmelerin Tutarları</h2>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span className="whitespace-nowrap">Eğitim Öğretim Dönemi:</span>
            <select
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">Tümü</option>
              {Object.keys(contractTotalsByYear)
                .filter((y) => y !== "Belirtilmemiş")
                .sort()
                .reverse()
                .map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              {contractTotalsByYear["Belirtilmemiş"] && (
                <option value="Belirtilmemiş">Belirtilmemiş</option>
              )}
            </select>
          </label>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="spinner" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            {(() => {
              const totals =
                selectedAcademicYear === "all"
                  ? overallContractTotals
                  : contractTotalsByYear[selectedAcademicYear] ?? {
                      newRegTotal: 0,
                      renewalTotal: 0,
                      total: 0
                    }
              const formatTL = (n: number) =>
                new Intl.NumberFormat("tr-TR", { style: "decimal", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + " TL"
              return (
                <>
                  <Card className="card-premium border-0 bg-gradient-to-br from-emerald-50 to-green-50">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs sm:text-sm">Yeni Kayıt Toplamı</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-emerald-700">
                        {formatTL(totals.newRegTotal)}
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Öğrenci için belirlenen ücret toplamı</p>
                    </CardContent>
                  </Card>
                  <Card className="card-premium border-0 bg-gradient-to-br from-orange-50 to-amber-50">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs sm:text-sm">Kayıt Yenileme Toplamı</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-orange-700">
                        {formatTL(totals.renewalTotal)}
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Öğrenci için belirlenen ücret toplamı</p>
                    </CardContent>
                  </Card>
                  <Card className="card-premium border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs sm:text-sm">Tüm Sözleşmeler Toplamı</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-700">
                        {formatTL(totals.total)}
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Yeni kayıt + Kayıt yenileme</p>
                    </CardContent>
                  </Card>
                </>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}
