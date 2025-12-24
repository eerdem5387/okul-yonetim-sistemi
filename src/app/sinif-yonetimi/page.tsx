"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { School, Plus, Users, Calendar, BookOpen, Loader2 } from "lucide-react"
import Link from "next/link"

interface Class {
  id: string
  name: string
  grade: number
  section: string
  counselor?: {
    firstName: string
    lastName: string
  } | null
  _count?: {
    students: number
    schedules: number
  }
}

export default function ClassManagementPage() {
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    // Kullanıcı rol ve ID kontrolü
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("auth_role")
      const id = localStorage.getItem("staff_id")
      setUserRole(role)
      fetchClasses(role, id)
    }
  }, [])

  const fetchClasses = async (role: string | null, staffId: string | null) => {
    try {
      let url = "/api/classes"
      
      // ✅ Rehberlik kullanıcısı ise sadece kendisine atanan sınıfları göster
      if (role === "counselor" && staffId) {
        url += `?counselorId=${staffId}`
      }
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setClasses(data.classes)
      }
    } catch (error) {
      console.error("Error fetching classes:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <School className="h-8 w-8 text-blue-600" />
            Sınıf Yönetimi
          </h1>
          <p className="text-gray-600 mt-2">
            Sınıfları yönetin, öğrenci atayın ve ders programlarını düzenleyin
          </p>
        </div>
        {/* ✅ Sadece Yönetici, Müdür ve Öğrenci İşleri sınıf oluşturabilir */}
        {(userRole === "admin" || userRole === "principal" || userRole === "student_affairs") && (
          <Link href="/sinif-yonetimi/yeni">
            <Button size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Yeni Sınıf Oluştur
            </Button>
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Toplam Sınıf</p>
                <p className="text-2xl font-bold">{classes.length}</p>
              </div>
              <School className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Toplam Öğrenci</p>
                <p className="text-2xl font-bold">
                  {classes.reduce((sum, c) => sum + (c._count?.students || 0), 0)}
                </p>
              </div>
              <Users className="h-10 w-10 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ortaokul (5-8)</p>
                <p className="text-2xl font-bold">
                  {classes.filter(c => c.grade >= 5 && c.grade <= 8).length}
                </p>
              </div>
              <BookOpen className="h-10 w-10 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Lise (9-12)</p>
                <p className="text-2xl font-bold">
                  {classes.filter(c => c.grade >= 9 && c.grade <= 12).length}
                </p>
              </div>
              <Calendar className="h-10 w-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Class List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : classes.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <School className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Henüz sınıf oluşturulmamış
            </h3>
            <p className="text-gray-600 mb-6">
              İlk sınıfınızı oluşturarak başlayın
            </p>
            {/* ✅ Sadece Yönetici, Müdür ve Öğrenci İşleri sınıf oluşturabilir */}
            {(userRole === "admin" || userRole === "principal" || userRole === "student_affairs") && (
              <Link href="/sinif-yonetimi/yeni">
                <Button>
                  <Plus className="h-5 w-5 mr-2" />
                  Yeni Sınıf Oluştur
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {classes.map((classItem) => (
            <Link key={classItem.id} href={`/sinif-yonetimi/${classItem.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <School className="h-5 w-5 text-blue-600" />
                    {classItem.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Seviye:</span>
                    <span className="font-medium">{classItem.grade}. Sınıf</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Şube:</span>
                    <span className="font-medium">{classItem.section}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Öğrenci:</span>
                    <span className="font-medium">{classItem._count?.students || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Ders:</span>
                    <span className="font-medium">{classItem._count?.schedules || 0}</span>
                  </div>
                  {classItem.counselor && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-gray-500">Rehberlik:</p>
                      <p className="text-sm font-medium">
                        {classItem.counselor.firstName} {classItem.counselor.lastName}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

