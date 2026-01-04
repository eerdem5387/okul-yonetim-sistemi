"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FileText, Shirt, Utensils, Bus, BookOpen, UserPlus, TrendingUp, Calendar, Activity, ArrowRight, Sparkles, Target, ClipboardList } from "lucide-react"
import Link from "next/link"

interface DashboardStats {
  totalStudents: number
  todayContracts: number
  monthContracts: number
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

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    todayContracts: 0,
    monthContracts: 0,
    totalClubs: 0,
    clubCapacityAverage: 0
  })
  const [recentStudents, setRecentStudents] = useState<RecentStudent[]>([])
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      const studentsRes = await fetch("/api/students?limit=1000")
      const studentsData = studentsRes.ok ? await studentsRes.json() : {}
      const students = Array.isArray(studentsData) ? studentsData : (studentsData.students || [])
      
      const clubsRes = await fetch("/api/clubs")
      const clubs = clubsRes.ok ? await clubsRes.json() : []
      
      const [newRegRes, renewalRes, uniformRes, mealRes, serviceRes, bookRes] = await Promise.all([
        fetch("/api/new-registrations"),
        fetch("/api/renewals"),
        fetch("/api/uniform-contracts"),
        fetch("/api/meal-contracts"),
        fetch("/api/service-contracts"),
        fetch("/api/book-contracts")
      ])
      
      // Her sözleşme türüne type bilgisini ekle
      const newRegistrations = newRegRes.ok ? (await newRegRes.json()).map((c: { id: string; studentId: string; createdAt: string }) => ({ ...c, type: "new-registration" })) : []
      const renewals = renewalRes.ok ? (await renewalRes.json()).map((c: { id: string; studentId: string; createdAt: string }) => ({ ...c, type: "renewal" })) : []
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
      
      const today = new Date().toISOString().split('T')[0]
      const todayContracts = allContracts.filter(c => 
        c.createdAt && c.createdAt.startsWith(today)
      ).length
      
      const thisMonth = new Date().toISOString().slice(0, 7)
      const monthContracts = allContracts.filter(c => 
        c.createdAt && c.createdAt.startsWith(thisMonth)
      ).length
      
      const clubCapacityAverage = clubs.length > 0
        ? clubs.reduce((acc: number, club: { selections?: unknown[]; capacity?: number }) => {
            const percentage = (club.selections?.length || 0) / (club.capacity || 1) * 100
            return acc + percentage
          }, 0) / clubs.length
        : 0
      
      setStats({
        totalStudents: Array.isArray(students) ? students.length : 0,
        todayContracts,
        monthContracts,
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8 animate-slide-in-right">
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
            <div className="text-[10px] sm:text-xs text-gray-500 font-medium">Bugün</div>
          </div>
          <div className="stat-card-value text-xl sm:text-2xl lg:text-3xl">
            {loading ? <div className="spinner" /> : stats.todayContracts}
          </div>
          <div className="stat-card-label text-xs sm:text-sm">Yeni Sözleşme</div>
          <Link href="/history" className="mt-2 sm:mt-3 lg:mt-4 text-[10px] sm:text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 hover:gap-2 transition-all">
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
            <div className="text-[10px] sm:text-xs text-gray-500 font-medium">Bu Ay</div>
          </div>
          <div className="stat-card-value text-xl sm:text-2xl lg:text-3xl">
            {loading ? <div className="spinner" /> : stats.monthContracts}
          </div>
          <div className="stat-card-label text-xs sm:text-sm">Aylık Sözleşme</div>
          <div className="mt-2 sm:mt-3 lg:mt-4 flex items-center gap-1.5 sm:gap-2">
            <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 bg-orange-500 rounded-full animate-pulse" />
            <span className="text-[10px] sm:text-xs text-gray-500">Aktif dönem</span>
          </div>
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

      {/* Quick Actions */}
      <div className="section-header animate-fade-in mb-3 sm:mb-4 lg:mb-6">
        <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-blue-600" />
        <h2 className="section-title text-base sm:text-lg lg:text-xl">Hızlı İşlemler</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 animate-slide-in-right">
        <Link href="/students">
          <div className="dashboard-card relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-indigo-600/5 group-hover:from-blue-600/10 group-hover:to-indigo-600/10 transition-all" />
            <CardHeader className="relative px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <div className="p-2 sm:p-3 bg-blue-100 rounded-lg sm:rounded-xl group-hover:scale-110 transition-transform">
                  <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 icon-blue" />
                </div>
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </div>
              <CardTitle className="text-sm sm:text-base lg:text-lg font-bold text-gray-900">Öğrenci Yönetimi</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Öğrenci bilgilerini yönetin</CardDescription>
            </CardHeader>
          </div>
        </Link>

        <Link href="/basvurular">
          <div className="dashboard-card relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/5 to-blue-600/5 group-hover:from-cyan-600/10 group-hover:to-blue-600/10 transition-all" />
            <CardHeader className="relative px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <div className="p-2 sm:p-3 bg-cyan-100 rounded-lg sm:rounded-xl group-hover:scale-110 transition-transform">
                  <ClipboardList className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-cyan-600" />
                </div>
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 group-hover:text-cyan-600 group-hover:translate-x-1 transition-all" />
              </div>
              <CardTitle className="text-sm sm:text-base lg:text-lg font-bold text-gray-900">Başvurular</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Bursluluk sınavı başvuruları</CardDescription>
            </CardHeader>
          </div>
        </Link>

        <Link href="/clubs">
          <div className="dashboard-card relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/5 to-teal-600/5 group-hover:from-emerald-600/10 group-hover:to-teal-600/10 transition-all" />
            <CardHeader className="relative px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <div className="p-2 sm:p-3 bg-emerald-100 rounded-lg sm:rounded-xl group-hover:scale-110 transition-transform">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 icon-green" />
                </div>
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
              </div>
              <CardTitle className="text-sm sm:text-base lg:text-lg font-bold text-gray-900">Kulüp Yönetimi</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Kulüpleri düzenleyin</CardDescription>
            </CardHeader>
          </div>
        </Link>

        <Link href="/new-registration">
          <div className="dashboard-card relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-pink-600/5 group-hover:from-purple-600/10 group-hover:to-pink-600/10 transition-all" />
            <CardHeader className="relative px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <div className="p-2 sm:p-3 bg-purple-100 rounded-lg sm:rounded-xl group-hover:scale-110 transition-transform">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 icon-purple" />
                </div>
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
              </div>
              <CardTitle className="text-sm sm:text-base lg:text-lg font-bold text-gray-900">Yeni Kayıt</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Yeni öğrenci kaydı</CardDescription>
            </CardHeader>
          </div>
        </Link>

        <Link href="/renewal">
          <div className="dashboard-card relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-600/5 to-amber-600/5 group-hover:from-orange-600/10 group-hover:to-amber-600/10 transition-all" />
            <CardHeader className="relative px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <div className="p-2 sm:p-3 bg-orange-100 rounded-lg sm:rounded-xl group-hover:scale-110 transition-transform">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 icon-orange" />
                </div>
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
              </div>
              <CardTitle className="text-sm sm:text-base lg:text-lg font-bold text-gray-900">Kayıt Yenileme</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Kayıt yenileme işlemleri</CardDescription>
            </CardHeader>
          </div>
        </Link>

        <Link href="/uniform">
          <div className="dashboard-card relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-600/5 to-rose-600/5 group-hover:from-pink-600/10 group-hover:to-rose-600/10 transition-all" />
            <CardHeader className="relative px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <div className="p-2 sm:p-3 bg-pink-100 rounded-lg sm:rounded-xl group-hover:scale-110 transition-transform">
                  <Shirt className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 icon-pink" />
                </div>
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 group-hover:text-pink-600 group-hover:translate-x-1 transition-all" />
              </div>
              <CardTitle className="text-sm sm:text-base lg:text-lg font-bold text-gray-900">Forma Sözleşmesi</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Forma sözleşmeleri</CardDescription>
            </CardHeader>
          </div>
        </Link>

        <Link href="/meal">
          <div className="dashboard-card relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-600/5 to-cyan-600/5 group-hover:from-teal-600/10 group-hover:to-cyan-600/10 transition-all" />
            <CardHeader className="relative px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <div className="p-2 sm:p-3 bg-teal-100 rounded-lg sm:rounded-xl group-hover:scale-110 transition-transform">
                  <Utensils className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 icon-teal" />
                </div>
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all" />
              </div>
              <CardTitle className="text-sm sm:text-base lg:text-lg font-bold text-gray-900">Yemek Sözleşmesi</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Yemek sözleşmeleri</CardDescription>
            </CardHeader>
          </div>
        </Link>

        <Link href="/service">
          <div className="dashboard-card relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-blue-600/5 group-hover:from-indigo-600/10 group-hover:to-blue-600/10 transition-all" />
            <CardHeader className="relative px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <div className="p-2 sm:p-3 bg-indigo-100 rounded-lg sm:rounded-xl group-hover:scale-110 transition-transform">
                  <Bus className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-indigo-600" />
                </div>
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
              </div>
              <CardTitle className="text-sm sm:text-base lg:text-lg font-bold text-gray-900">Servis Sözleşmesi</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Servis sözleşmeleri</CardDescription>
            </CardHeader>
          </div>
        </Link>

        <Link href="/book">
          <div className="dashboard-card relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-600/5 to-yellow-600/5 group-hover:from-amber-600/10 group-hover:to-yellow-600/10 transition-all" />
            <CardHeader className="relative px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <div className="p-2 sm:p-3 bg-amber-100 rounded-lg sm:rounded-xl group-hover:scale-110 transition-transform">
                  <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-amber-600" />
                </div>
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
              </div>
              <CardTitle className="text-sm sm:text-base lg:text-lg font-bold text-gray-900">Kitap Sözleşmesi</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Kitap sözleşmeleri</CardDescription>
            </CardHeader>
          </div>
        </Link>
      </div>
    </div>
  )
}
