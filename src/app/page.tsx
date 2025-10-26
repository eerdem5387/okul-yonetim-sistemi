"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FileText, Shirt, Utensils, Bus, BookOpen, UserPlus, History, TrendingUp, Calendar, Activity } from "lucide-react"
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
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Öğrenci sayısını al
      const studentsRes = await fetch("/api/students")
      const students = studentsRes.ok ? await studentsRes.json() : []
      
      // Kulüpleri al
      const clubsRes = await fetch("/api/clubs")
      const clubs = clubsRes.ok ? await clubsRes.json() : []
      
      // Tüm sözleşmeleri al
      const [newRegRes, renewalRes, uniformRes, mealRes, serviceRes, bookRes] = await Promise.all([
        fetch("/api/new-registrations"),
        fetch("/api/renewals"),
        fetch("/api/uniform-contracts"),
        fetch("/api/meal-contracts"),
        fetch("/api/service-contracts"),
        fetch("/api/book-contracts")
      ])
      
      const allContracts = [
        ...(newRegRes.ok ? await newRegRes.json() : []),
        ...(renewalRes.ok ? await renewalRes.json() : []),
        ...(uniformRes.ok ? await uniformRes.json() : []),
        ...(mealRes.ok ? await mealRes.json() : []),
        ...(serviceRes.ok ? await serviceRes.json() : []),
        ...(bookRes.ok ? await bookRes.json() : [])
      ]
      
      // Bugünkü sözleşmeler
      const today = new Date().toISOString().split('T')[0]
      const todayContracts = allContracts.filter(c => 
        c.createdAt && c.createdAt.startsWith(today)
      ).length
      
      // Bu ayki sözleşmeler
      const thisMonth = new Date().toISOString().slice(0, 7)
      const monthContracts = allContracts.filter(c => 
        c.createdAt && c.createdAt.startsWith(thisMonth)
      ).length
      
      // Kulüp doluluk ortalaması
      const clubCapacityAverage = clubs.length > 0
        ? clubs.reduce((acc: number, club: any) => {
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
      
      // Son eklenen 5 öğrenci
      if (Array.isArray(students)) {
        const sorted = [...students].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ).slice(0, 5)
        setRecentStudents(sorted)
      }
      
      // Son 10 işlem (tüm sözleşmelerden)
      const allContractsWithDetails = allContracts.map((contract: any) => {
        const student = students.find((s: any) => s.id === contract.studentId)
        return {
          id: contract.id,
          type: contract.type || "unknown",
          studentName: student ? `${student.firstName} ${student.lastName}` : "Bilinmeyen Öğrenci",
          createdAt: contract.createdAt,
          contractType: getContractTypeDisplay(contract.type)
        }
      }).sort((a: any, b: any) => 
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
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Okul Yönetim Sistemi</h1>
        <p className="text-gray-600 mt-2">Öğrenci kayıt ve sözleşme yönetim paneli</p>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="card-soft border-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <span>Toplam Öğrenci</span>
              <Users className="h-8 w-8 icon-blue" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {loading ? "..." : stats.totalStudents}
            </div>
            <p className="text-xs text-gray-500 mt-1">Kayıtlı öğrenci sayısı</p>
          </CardContent>
        </Card>

        <Card className="card-soft border-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <span>Bugün</span>
              <Calendar className="h-8 w-8 icon-green" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {loading ? "..." : stats.todayContracts}
            </div>
            <p className="text-xs text-gray-500 mt-1">Bugün oluşturulan sözleşme</p>
          </CardContent>
        </Card>

        <Card className="card-soft border-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <span>Bu Ay</span>
              <TrendingUp className="h-8 w-8 icon-orange" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {loading ? "..." : stats.monthContracts}
            </div>
            <p className="text-xs text-gray-500 mt-1">Bu ay oluşturulan sözleşme</p>
          </CardContent>
        </Card>

        <Card className="card-soft border-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <span>Kulüpler</span>
              <Activity className="h-8 w-8 icon-purple" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {loading ? "..." : `%${stats.clubCapacityAverage}`}
            </div>
            <p className="text-xs text-gray-500 mt-1">{stats.totalClubs} kulüp - Ortalama doluluk</p>
          </CardContent>
        </Card>
      </div>

      {/* Son Eklenen Öğrenciler */}
      <Card className="card-soft border-0 mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 icon-blue" />
            Son Eklenen Öğrenciler
          </CardTitle>
          <CardDescription>En son eklenen 5 öğrenci</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500">Yükleniyor...</p>
          ) : recentStudents.length > 0 ? (
            <div className="space-y-2">
              {recentStudents.map((student) => (
                <Link
                  key={student.id}
                  href="/students"
                  className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {student.firstName} {student.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{student.grade}</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(student.createdAt).toLocaleDateString('tr-TR')}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Henüz öğrenci eklenmemiş</p>
          )}
        </CardContent>
      </Card>

      {/* Son İşlemler Widget */}
      <Card className="card-soft border-0 mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 icon-orange" />
            Son İşlemler
          </CardTitle>
          <CardDescription>Son oluşturulan 10 sözleşme</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500">Yükleniyor...</p>
          ) : recentActivities.length > 0 ? (
            <div className="space-y-2">
              {recentActivities.map((activity) => (
                <Link
                  key={activity.id}
                  href="/history"
                  className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {activity.contractType}
                      </p>
                      <p className="text-xs text-gray-500">{activity.studentName}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(activity.createdAt).toLocaleDateString('tr-TR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Henüz sözleşme oluşturulmamış</p>
          )}
        </CardContent>
      </Card>

      <h2 className="text-xl font-semibold text-gray-900 mb-4">Hızlı İşlemler</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
        <Link href="/students">
          <Card className="card-soft dashboard-card hover:shadow-lg transition-all duration-200 cursor-pointer border-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <UserPlus className="h-6 w-6 icon-blue" />
                Öğrenci Yönetimi
              </CardTitle>
              <CardDescription className="text-sm">
                Öğrenci bilgilerini yönetin ve düzenleyin
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600">
                Öğrenci ekleyin, düzenleyin ve arama yapın.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/clubs">
          <Card className="card-soft dashboard-card hover:shadow-lg transition-all duration-200 cursor-pointer border-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <Users className="h-6 w-6 icon-green" />
                Kulüp Yönetimi
              </CardTitle>
              <CardDescription className="text-sm">
                Kulüp oluşturma ve öğrenci kulüp seçimlerini yönetin
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600">
                Yeni kulüpler oluşturun, kontejan belirleyin ve öğrenci seçimlerini takip edin.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/new-registration">
          <Card className="card-soft dashboard-card hover:shadow-lg transition-all duration-200 cursor-pointer border-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <FileText className="h-6 w-6 icon-green" />
                Yeni Kayıt
              </CardTitle>
              <CardDescription className="text-sm">
                Yeni öğrenci kayıt sözleşmelerini oluşturun
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600">
                Yeni öğrenci kayıt sözleşmelerini doldurun ve PDF olarak indirin.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/renewal">
          <Card className="card-soft dashboard-card hover:shadow-lg transition-all duration-200 cursor-pointer border-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <FileText className="h-6 w-6 icon-orange" />
                Kayıt Yenileme
              </CardTitle>
              <CardDescription className="text-sm">
                Mevcut öğrenci kayıt yenileme sözleşmelerini oluşturun
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600">
                Kayıt yenileme sözleşmelerini doldurun ve PDF olarak indirin.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/uniform">
          <Card className="card-soft dashboard-card hover:shadow-lg transition-all duration-200 cursor-pointer border-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <Shirt className="h-6 w-6 icon-purple" />
                Forma Sözleşmesi
              </CardTitle>
              <CardDescription className="text-sm">
                Öğrenci forma sözleşmelerini oluşturun
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600">
                Forma sözleşmelerini doldurun ve PDF olarak indirin.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/meal">
          <Card className="card-soft dashboard-card hover:shadow-lg transition-all duration-200 cursor-pointer border-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <Utensils className="h-6 w-6 icon-red" />
                Yemek Sözleşmesi
              </CardTitle>
              <CardDescription className="text-sm">
                Öğrenci yemek sözleşmelerini oluşturun
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600">
                Yemek sözleşmelerini doldurun ve PDF olarak indirin.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/service">
          <Card className="card-soft dashboard-card hover:shadow-lg transition-all duration-200 cursor-pointer border-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <Bus className="h-6 w-6 icon-cyan" />
                Servis Sözleşmesi
              </CardTitle>
              <CardDescription className="text-sm">
                Öğrenci servis sözleşmelerini oluşturun
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600">
                Servis sözleşmelerini doldurun ve PDF olarak indirin.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/book">
          <Card className="card-soft dashboard-card hover:shadow-lg transition-all duration-200 cursor-pointer border-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <BookOpen className="h-6 w-6 icon-lime" />
                Kitap Sözleşmesi
              </CardTitle>
              <CardDescription className="text-sm">
                Öğrenci kitap sözleşmelerini oluşturun
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600">
                Kitap sözleşmelerini doldurun ve PDF olarak indirin.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/history">
          <Card className="card-soft dashboard-card hover:shadow-lg transition-all duration-200 cursor-pointer border-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <History className="h-6 w-6 icon-pink" />
                Geçmiş Sözleşmeler
              </CardTitle>
              <CardDescription className="text-sm">
                Tüm sözleşmeleri görüntüleyin ve yönetin
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600">
                Geçmiş sözleşmeleri görüntüleyin, düzenleyin ve PDF olarak indirin.
              </p>
            </CardContent>
          </Card>
        </Link>
        </div>
    </div>
  )
}